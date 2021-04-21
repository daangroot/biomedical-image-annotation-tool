import { Input, Component, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import * as L from 'leaflet';

import { environment } from '../../../environments/environment';
import { ImageInfo } from '../../types/image-info.type';
import { LeafletService } from './leaflet.service';

@Component({
  selector: 'app-leaflet',
  templateUrl: './leaflet.component.html',
  styleUrls: ['./leaflet.component.css']
})
export class LeafletComponent implements OnChanges, OnInit {
  @Input() imageId!: string;
  @Input() imageInfo!: ImageInfo;
  private map!: L.Map;
  private readonly tileSize: number = 256;

  constructor(private leafletService: LeafletService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.imageInfo && changes.imageInfo.currentValue) {
      this.setMaxZoomLevel(changes.imageInfo.currentValue);
    }
  }

  ngOnInit(): void {
    this.initMap();
  }

  private initMap(): void {
    this.map = L.map('leaflet-viewer', {
      crs: L.CRS.Simple,
      maxBounds: [[256, -256], [-512, 512]]
    });
    this.map.setView([0, 0], 0);

    L.tileLayer(`${environment.apiUrl}/api/images/${this.imageId}/tiles/{z}/{y}/{x}`, {
      bounds: [[0, 0], [-256, 256]],
      tileSize: this.tileSize
    }).addTo(this.map);
  }

  private setMaxZoomLevel(imageInfo: ImageInfo) {
    const maxZoom = this.leafletService.calcMaxZoomLevel(imageInfo.width, imageInfo.height, this.tileSize);
    this.map.setMaxZoom(maxZoom);
  }
}
