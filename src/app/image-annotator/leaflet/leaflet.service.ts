import { Injectable } from '@angular/core';

import * as L from 'leaflet';

@Injectable({
  providedIn: 'root'
})
export class LeafletService {

  constructor() { }

  calcMaxZoomLevel(imageWidth: number, imageHeight: number, tileSize: number): number {
    let val: number = Math.max(imageWidth, imageHeight);
    let level: number = 0;
    while (val > tileSize) {
      val /= 2;
      level++;
    }
    return level;
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

  toLatLngBounds(sw: L.PointExpression, ne: L.PointExpression, map: L.Map): L.LatLngBounds {
    const swLatLng: L.LatLng = this.toLatLng(sw, map);
    const neLatLng: L.LatLng = this.toLatLng(ne, map);
    return L.latLngBounds(swLatLng, neLatLng);
  }

  toLatLng(point: L.PointExpression, map: L.Map): L.LatLng {
    return map.unproject(point, map.getMaxZoom());
  }

  createPolygonMarker(ring: Array<L.PointTuple>, color: string, map: L.Map) {
    const latLngs: Array<L.LatLng> = [];
    ring.forEach(point =>
      latLngs.push(this.toLatLng(point, map))
    )
    return L.polygon(latLngs, { color: color });
  }
}
