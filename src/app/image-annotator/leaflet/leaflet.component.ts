import { Input, Component, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import * as L from 'leaflet';

import { environment } from '../../../environments/environment';
import { HeaderService } from '../../header/header.service';
import { ImageInfo } from '../../types/image-info.type';
import { LeafletService } from './leaflet.service';

import { ImageService } from '../../services/image.service';

@Component({
  selector: 'app-leaflet',
  templateUrl: './leaflet.component.html',
  styleUrls: ['./leaflet.component.css']
})
export class LeafletComponent implements OnChanges, OnInit {
  @Input() imageInfo!: ImageInfo;
  leafletContainerCssHeight!: string;
  private map!: L.Map;
  private readonly tileSize: number = 256;

  constructor(private headerService: HeaderService,
    private leafletService: LeafletService,
    private imageService: ImageService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.imageInfo && changes.imageInfo.currentValue) {
      this.initMap(changes.imageInfo.currentValue);
    }
  }

  ngOnInit(): void {
    this.leafletContainerCssHeight = `calc(100% - ${this.headerService.headerHeight}px)`;
  }

  private initMap(imageInfo: ImageInfo): void {
    const sw: L.PointExpression = [0, imageInfo.height];
    const ne: L.PointExpression = [imageInfo.width, 0];

    this.map = L.map('leaflet-viewer', {
      crs: L.CRS.Simple,
      maxZoom: this.leafletService.calcMaxZoomLevel(imageInfo.width, imageInfo.height, this.tileSize),
      zoomControl: false
    });

    this.map.setView([0, 0], 0);
    
    const offset: number = this.tileSize * 5;
    const swMax: L.PointExpression = [sw[0] - offset, sw[1] + offset];
    const neMax: L.PointExpression = [ne[0] + offset, ne[1] - offset];
    this.map.setMaxBounds(this.toLatLngBounds(swMax, neMax));

    L.tileLayer(`${environment.apiUrl}/api/images/${imageInfo.id}/tiles/{z}/{y}/{x}`, {
      bounds: this.toLatLngBounds(sw, ne),
      tileSize: this.tileSize
    }).addTo(this.map);

    L.control.zoom({
      position: 'bottomright'
    }).addTo(this.map);
  }

  private toLatLngBounds(sw: L.PointExpression, ne: L.PointExpression): L.LatLngBounds {
    const swLatLng: L.LatLng = this.toLatLng(sw);
    const neLatLng: L.LatLng = this.toLatLng(ne);
    return L.latLngBounds(swLatLng, neLatLng);
  }

  private toLatLng(point: L.PointExpression): L.LatLng {
    return this.map.unproject(point, this.map.getMaxZoom());
  }
}
