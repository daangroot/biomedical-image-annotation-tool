import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import { Feature, Polygon, MultiPolygon } from 'geojson';
import simplify from '@turf/simplify';

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

  haveEqualPolygons(feature1: Feature<Polygon, any>, feature2: Feature<Polygon, any>): boolean {
    if (feature1.geometry.coordinates.length !== feature2.geometry.coordinates.length) {
      return false;
    }

    for (let i = 0; i < feature1.geometry.coordinates.length; i++) {
      if (feature1.geometry.coordinates[i].length !== feature2.geometry.coordinates[i].length) {
        return false;
      }
      for (let j = 0; j < feature1.geometry.coordinates[i].length; j++) {
        if (feature1.geometry.coordinates[i][j][0] !== feature2.geometry.coordinates[i][j][0] ||
              feature1.geometry.coordinates[i][j][1] !== feature2.geometry.coordinates[i][j][1]) {
          return false;
        }
      }
    }

    return true;
  }

  hasNonTriangularRing(feature: Feature<Polygon, any>): boolean {
    for (const ring of feature.geometry.coordinates) {
      if (ring.length > 4) {
        return true;
      }
    }

    return false;
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

  simplifyFeature(feature: Feature<Polygon, any>, tolerance: number = 1): Feature<Polygon, any> {
    // turf simplify uses the Ramer-Douglas-Peucker algorithm.
    return simplify(feature, {
      tolerance: tolerance
    });
  }

  removeInnerRings(polygon: L.PointTuple[][]): L.PointTuple[][] {
    return [polygon[0]];
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

  createShowControlsControl(onClick: Function): L.Control {
    const button = L.DomUtil.create('a');
    button.onclick = () => onClick();
    button.setAttribute('title', 'Show buttons');
    button.style.backgroundImage = 'url("/assets/expand_more.png")';
    button.style.backgroundSize = '24px 24px';
    L.DomEvent.disableClickPropagation(button);
    return this.createButtonControl(button, 'topleft');
  }

  createHideControlsControl(onClick: Function): L.Control {
    const button = L.DomUtil.create('a');
    button.onclick = () => onClick();
    button.setAttribute('title', 'Hide buttons');
    button.style.backgroundImage = 'url("/assets/expand_less.png")';
    button.style.backgroundSize = '24px 24px';
    L.DomEvent.disableClickPropagation(button);
    return this.createButtonControl(button, 'topleft');
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
    button.setAttribute('title', 'Draw segment');
    button.style.backgroundImage = 'url("/assets/polygon.png")';
    button.style.backgroundSize = '24px 24px';
    L.DomEvent.disableClickPropagation(button);
    return this.createButtonControl(button, 'topleft');
  }

  createCancelDrawFeatureControl(onClick: Function): L.Control {
    const button = L.DomUtil.create('a');
    button.onclick = () => onClick();
    button.setAttribute('title', 'Cancel segment drawing');
    button.style.backgroundImage = 'url("/assets/close.png")';
    button.style.backgroundSize = '24px 24px';
    L.DomEvent.disableClickPropagation(button);
    return this.createButtonControl(button, 'topleft');
  }

  createCutFeatureControl(onClick: Function): L.Control {
    const button = L.DomUtil.create('a');
    button.onclick = () => onClick();
    button.setAttribute('title', 'Cut segment');
    button.style.backgroundImage = 'url("/assets/cut.png")';
    button.style.backgroundSize = '24px 24px';
    L.DomEvent.disableClickPropagation(button);
    return this.createButtonControl(button, 'topleft');
  }

  createCancelCutFeatureControl(onClick: Function): L.Control {
    const button = L.DomUtil.create('a');
    button.onclick = () => onClick();
    button.setAttribute('title', 'Cancel segment cutting');
    button.style.backgroundImage = 'url("/assets/close.png")';
    button.style.backgroundSize = '24px 24px';
    L.DomEvent.disableClickPropagation(button);
    return this.createButtonControl(button, 'topleft');
  }

  createSimplifyAllFeaturesControl(onClick: Function): L.Control {
    const button = L.DomUtil.create('a');
    button.onclick = () => onClick();
    button.setAttribute('title', 'Simplify all segments');
    button.style.backgroundImage = 'url("/assets/simplify.png")';
    button.style.backgroundSize = '24px 24px';
    L.DomEvent.disableClickPropagation(button);
    return this.createButtonControl(button, 'topleft');
  }

  createRemoveAllInnerRingsControl(onClick: Function): L.Control {
    const button = L.DomUtil.create('a');
    button.onclick = () => onClick();
    button.setAttribute('title', 'Remove all holes');
    button.style.backgroundImage = 'url("/assets/delete_inner_rings.png")';
    button.style.backgroundSize = '24px 24px';
    L.DomEvent.disableClickPropagation(button);
    return this.createButtonControl(button, 'topleft');
  }

  createFeatureEditUndoControl(onClick: Function): L.Control {
    const button = L.DomUtil.create('a');
    button.onclick = () => onClick();
    button.setAttribute('title', 'Undo last operation');
    button.style.backgroundImage = 'url("/assets/undo.png")';
    button.style.backgroundSize = '24px 24px';
    L.DomEvent.disableClickPropagation(button);
    return this.createButtonControl(button, 'topright');
  }
}
