import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import { Feature, Geometry, Polygon, MultiPolygon } from 'geojson';

@Injectable({
  providedIn: 'root'
})
export class LeafletService {
  private map!: L.Map;
  private maxNativeZoom!: number; 

  constructor() { }

  setMap(map: L.Map): void {
    this.map = map;
  }

  setMaxNativeZoom(maxNativeZoom: number): void {
    this.maxNativeZoom = maxNativeZoom;
  }

  createMap(htmlId: string, canInteract: boolean = true): L.Map {
    return L.map(htmlId, {
      crs: L.CRS.Simple,
      zoomControl: false,
      dragging: canInteract,
      scrollWheelZoom: canInteract,
      doubleClickZoom: canInteract,
      touchZoom: canInteract,
      boxZoom: canInteract,
      keyboard: canInteract
    });
  }

  calcMaxNativeZoomLevel(imageWidth: number, imageHeight: number, tileSize: number): number {
    let val: number = Math.max(imageWidth, imageHeight);
    let level: number = 0;
    while (val > tileSize) {
      val /= 2;
      level++;
    }
    return level;
  }

  isPolygon(points: L.PointTuple[][] | L.PointTuple[][][]): boolean {
    return !Array.isArray(points[0][0][0]);
  }

  toLatLng(point: L.PointTuple): L.LatLng {
    return this.map.unproject(point, this.maxNativeZoom);
  }

  toPoint(latLng: L.LatLng): L.PointTuple {
    const point = this.map.project(latLng, this.maxNativeZoom);
    return [point.x, point.y];
  }

  ringToPoints(ring: L.LatLng[]): L.PointTuple[] {
    return ring.map(latLng => this.toPoint(latLng));
  }

  polygonToPoints(polygon: L.LatLng[][]): L.PointTuple[][] {
    return polygon.map(ring => this.ringToPoints(ring));
  }

  multiPolygonToPoints(multiPolygon: L.LatLng[][][]): L.PointTuple[][][] {
    return multiPolygon.map(polygon => this.polygonToPoints(polygon));
  }

  createPolygonFeature(points: L.PointTuple[][]): Feature<Polygon, any> {
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: points
      }
    };
  }

  createMultiPolygonFeature(points: L.PointTuple[][][]): Feature<MultiPolygon, any> {
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'MultiPolygon',
        coordinates: points
      }
    };
  }

  layerToPoints(layer: L.Layer): L.PointTuple[][] | L.PointTuple[][][] {
    // @ts-ignore
    const latLngs = layer._latlngs;
    if (!Array.isArray(latLngs[0][0])) { // Polygon
      for (const ring of latLngs as L.LatLng[][]) {
        if (ring[0].lat !== ring[ring.length - 1].lat || ring[0].lng !== ring[ring.length - 1].lng) {
          ring.push(ring[0]);
        }
      }
      return this.polygonToPoints(latLngs);
    } else {
      for (let polygon of latLngs as L.LatLng[][][]) {
        for (const ring of polygon) {
          if (ring[0].lat !== ring[ring.length - 1].lat || ring[0].lng !== ring[ring.length - 1].lng) {
            ring.push(ring[0]);
          }
        }
      }
      return this.multiPolygonToPoints(latLngs);
    }
  }

  layerToFeature(layer: L.Layer): Feature<Geometry, any> {
    const points = this.layerToPoints(layer);
    if (this.isPolygon(points)) {
      return this.createPolygonFeature(points as L.PointTuple[][]);
    } else {
      return this.createMultiPolygonFeature(points as L.PointTuple[][][])
    }
  }

  splitMultiPolygonFeature(feature: Feature<MultiPolygon, any>): Feature<Polygon, any>[] {
    return feature.geometry.coordinates.map(polygon =>
      this.createPolygonFeature(polygon as L.PointTuple[][])
    )
  }

  removeInnerPolygons(feature: Feature<Geometry, any>): Feature<Geometry, any> {
    if (feature.geometry.type === 'Polygon') {
      feature.geometry.coordinates = [feature.geometry.coordinates[0]];
    } else if (feature.geometry.type === 'MultiPolygon') {
      feature.geometry.coordinates = [feature.geometry.coordinates[0][0]] as any;
      feature.geometry.type = 'Polygon' as any;
    }
    return feature;
  }

  createTextControl(text: string, position: L.ControlPosition): L.Control {
    const Control = L.Control.extend({
      onAdd(map: L.Map) {
        const container: HTMLElement = L.DomUtil.create('div');
        container.innerHTML = text;
        return container;
      },

      onRemove(map: L.Map) { },
    });
    return new Control({
      position: position
    })
  }

  createButtonControl(button: HTMLElement, position: L.ControlPosition): L.Control {
    const Control = L.Control.extend({
      onAdd(map: L.Map) {
        button.setAttribute('role', 'button');
        const container: HTMLElement = L.DomUtil.create('div', 'leaflet-control leaflet-bar');
        container.appendChild(button);
        return container;
      },

      onRemove(map: L.Map) { },
    });
    return new Control({
      position: position
    })
  }

  createSplitScreenControl(onClick: Function): L.Control {
    const button = L.DomUtil.create('a');
    button.onclick = () => onClick();
    button.setAttribute('title', 'Split screen');
    button.style.backgroundImage = 'url("/assets/swap_horiz.png")';
    button.style.backgroundSize = '24px 24px';
    L.DomEvent.disableClickPropagation(button);
    return this.createButtonControl(button, 'topleft');
  }

  createMaskControl(): L.Control {
    const button = L.DomUtil.create('a');
    button.setAttribute('data-bs-toggle', 'offcanvas');
    button.setAttribute('href', '#mask-manager-offcanvas');
    button.setAttribute('title', 'Set mask');
    button.style.backgroundImage = 'url("/assets/layers.png")';
    button.style.backgroundSize = '24px 24px';
    L.DomEvent.disableClickPropagation(button);
    return this.createButtonControl(button, 'topleft');
  }

  createDrawFeatureControl(onClick: Function): L.Control {
    const button = L.DomUtil.create('a');
    button.onclick = () => onClick();
    button.setAttribute('title', 'Draw polygon');
    button.style.backgroundImage = 'url("/assets/polygon.png")';
    button.style.backgroundSize = '24px 24px';
    L.DomEvent.disableClickPropagation(button);
    return this.createButtonControl(button, 'topleft');
  }

  createCancelDrawFeatureControl(onClick: Function): L.Control {
    const button = L.DomUtil.create('a');
    button.onclick = () => onClick();
    button.setAttribute('title', 'Cancel polygon drawing');
    button.style.backgroundImage = 'url("/assets/close.png")';
    button.style.backgroundSize = '24px 24px';
    L.DomEvent.disableClickPropagation(button);
    return this.createButtonControl(button, 'topleft');
  }

  createCutFeatureControl(onClick: Function): L.Control {
    const button = L.DomUtil.create('a');
    button.onclick = () => onClick();
    button.setAttribute('title', 'Cut polygon');
    button.style.backgroundImage = 'url("/assets/cut.png")';
    button.style.backgroundSize = '24px 24px';
    L.DomEvent.disableClickPropagation(button);
    return this.createButtonControl(button, 'topleft');
  }

  createCancelCutFeatureControl(onClick: Function): L.Control {
    const button = L.DomUtil.create('a');
    button.onclick = () => onClick();
    button.setAttribute('title', 'Cancel polygon cutting');
    button.style.backgroundImage = 'url("/assets/close.png")';
    button.style.backgroundSize = '24px 24px';
    L.DomEvent.disableClickPropagation(button);
    return this.createButtonControl(button, 'topleft');
  }

  createRemoveAllInnerPolygonsControl(onClick: Function): L.Control {
    const button = L.DomUtil.create('a');
    button.onclick = () => onClick();
    button.setAttribute('title', 'Remove all inner polygons');
    button.style.backgroundImage = 'url("/assets/delete_inner_polygons.png")';
    button.style.backgroundSize = '24px 24px';
    L.DomEvent.disableClickPropagation(button);
    return this.createButtonControl(button, 'topleft');
  }

  createFeatureEditUndoControl(onClick: Function): L.Control {
    const button = L.DomUtil.create('a');
    button.onclick = () => onClick();
    button.setAttribute('title', 'Undo');
    button.style.backgroundImage = 'url("/assets/undo.png")';
    button.style.backgroundSize = '24px 24px';
    L.DomEvent.disableClickPropagation(button);
    return this.createButtonControl(button, 'topright');
  }
}
