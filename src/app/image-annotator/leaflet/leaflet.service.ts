import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import { Feature, Polygon, MultiPolygon } from 'geojson';

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

  createFeature(points: L.PointTuple[][]): Feature<Polygon, any> {
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: points
      }
    };
  }

  layerToPoints(layer: L.Layer): L.PointTuple[][] {
    // @ts-ignore
    const latLngs = layer._latlngs as L.LatLng[][];
    for (const ring of latLngs) {
      if (ring[0].lat !== ring[ring.length - 1].lat || ring[0].lng !== ring[ring.length - 1].lng) {
        ring.push(ring[0]);
      }
    }
    return this.polygonToPoints(latLngs);
  }

  layerToFeature(layer: L.Layer): Feature<Polygon, any> {
    return this.createFeature(this.layerToPoints(layer));
  }

  splitMultiPolygonFeature(feature: Feature<MultiPolygon, any>): Feature<Polygon, any>[] {
    return feature.geometry.coordinates.map(
      polygon => this.createFeature(polygon as L.PointTuple[][])
    )
  }

  removeInnerPolygons(feature: Feature<Polygon, any>): Feature<Polygon, any> {
    feature.geometry.coordinates = [feature.geometry.coordinates[0]];
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
