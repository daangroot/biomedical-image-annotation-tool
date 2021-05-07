import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import { Feature, Geometry } from 'geojson';

@Injectable({
  providedIn: 'root'
})
export class LeafletService {

  constructor() { }

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

  createGeoJsonFeature(fid: number, points: L.PointTuple[][] | L.PointTuple[][][]): Feature<Geometry, any> {
    const isMultiPolygon = Array.isArray(points[0][0][0]);
    return {
      type: 'Feature',
      properties: {
        FID: fid
      },
      geometry: {
        type: isMultiPolygon ? 'MultiPolygon' : 'Polygon',
        coordinates: points as any
      }
    };
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
    button.setAttribute('title', 'Cancel drawing polygon');
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
