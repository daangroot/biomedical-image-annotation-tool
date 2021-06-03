import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import { FeatureCollection, Feature, Polygon, MultiPolygon } from 'geojson';
import * as turf from '@turf/turf'

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

  createMap(htmlId: string): L.Map {
    return L.map(htmlId, {
      crs: L.CRS.Simple,
      zoomControl: false
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
    const latLngs = JSON.parse(JSON.stringify(layer._latlngs)) as L.LatLng[][];
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

  splitPolygonFeature(feature: Feature<Polygon | MultiPolygon, any>): Feature<Polygon, any>[] {
    if (feature.geometry.type === 'Polygon') {
      return [feature as Feature<Polygon, any>];
    } else {
      return feature.geometry.coordinates.map(
        polygon => this.createFeature(polygon as L.PointTuple[][])
      )
    }
  }

  mergeFeatures(features: Feature<Polygon, any>[]): Feature<Polygon | MultiPolygon, any> {
    let mergedFeature: Feature<Polygon | MultiPolygon, any> = features[0];
    for (let i = 1; i < features.length; i++) {
      mergedFeature = turf.union(mergedFeature, features[i]);
    }
    return mergedFeature;
  }

  createConvexHullFeature(features: Feature<Polygon, any>[]): Feature<Polygon, any> | null {
    const featureCollection = turf.featureCollection(features);
    return turf.convex(featureCollection);
  }

  simplifyFeature(feature: Feature<Polygon, any>, tolerance: number = 1): Feature<Polygon, any> {
    // turf simplify uses the Ramer-Douglas-Peucker algorithm.
    return turf.simplify(feature, {
      tolerance: tolerance
    });
  }

  removeInnerRings(polygon: L.PointTuple[][]): L.PointTuple[][] {
    return [polygon[0]];
  }

  createButtonControl(button: HTMLElement, position: L.ControlPosition): L.Control {
    const Control = L.Control.extend({
      onAdd(map: L.Map) {
        const container: HTMLElement = L.DomUtil.create('div', 'leaflet-control leaflet-bar');
        container.appendChild(button);
        return container;
      },
    });
    return new Control({
      position: position
    })
  }

  createButtonsControl(buttons: HTMLElement[], position: L.ControlPosition): L.Control {
    const Control = L.Control.extend({
      onAdd(map: L.Map) {
        const container: HTMLElement = L.DomUtil.create('div', 'leaflet-control leaflet-bar');
        for (const button of buttons) {
          container.appendChild(button);
        }
        return container;
      },
    });
    return new Control({
      position: position
    })
  }

  createButtonElement(title: string, image: string, onClick: Function): HTMLElement {
    const button = L.DomUtil.create('a');
    button.setAttribute('role', 'button');
    button.title = title;
    button.style.backgroundImage = `url("/assets/${image}.png")`;
    button.style.backgroundSize = '24px 24px';
    if (onClick) {
      button.onclick = () => onClick();
    }
    L.DomEvent.disableClickPropagation(button);
    return button;
  }

  createUnsavedChangesControl(): L.Control {
    const Control = L.Control.extend({
      badge: L.DomUtil.create('span', 'badge bg-primary'),
      onAdd(map: L.Map) {
        this.badge.innerHTML = 'Unsaved changes';
        this.badge.style.fontSize = '1em';
        this.setVisible(false);
        return this.badge;
      },
      setVisible(visible: boolean) {
        this.badge.classList.toggle('d-none', !visible);
      }
    });
    return new Control({
      position: 'bottomleft'
    });
  }
}
