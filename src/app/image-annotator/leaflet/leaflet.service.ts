import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LeafletService {

  constructor() { }

  calcMaxZoomLevel(imageWidth: number, imageHeight: number, tileSize: number) {
    let val: number = Math.max(imageWidth, imageHeight);
    let level: number = 0;
    while (val > tileSize) {
      val /= 2;
      level++;
    }
    return level;
  }
}
