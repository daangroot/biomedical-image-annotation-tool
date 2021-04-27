import { Input, Component, OnChanges, OnInit, SimpleChanges, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';

import { environment } from '../../../environments/environment';
import { HeaderService } from '../../header/header.service';
import { ApiService } from '../../services/api.service';
import { ImageInfo } from '../../types/image-info.type';
import { Polygon } from '../../types/polygon.type';
import { MaskManagerService } from '../mask-manager/mask-manager.service';
import { LeafletService } from './leaflet.service';

@Component({
  selector: 'app-leaflet',
  templateUrl: './leaflet.component.html',
  styleUrls: ['./leaflet.component.css']
})
export class LeafletComponent implements OnInit, AfterViewInit {
  @Input() bioImageInfo!: ImageInfo;
  leafletContainerCssHeight!: string;
  private map!: L.Map;
  private polygonLayer!: L.LayerGroup;
  private readonly tileSize: number = 256;
  private selectedMaskId: string | null = null;

  constructor(
    private apiService: ApiService,
    private headerService: HeaderService,
    private leafletService: LeafletService,
    private maskManagerService: MaskManagerService
  ) { }

  ngOnInit(): void {
    this.maskManagerService.maskSelected$.subscribe(
      id => {
        this.selectedMaskId = id;
        this.updatePolygons();
      }
    )

    this.leafletContainerCssHeight = `calc(100% - ${this.headerService.headerHeight}px)`;
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  private initMap(): void {
    const sw: L.PointExpression = [0, this.bioImageInfo.height];
    const ne: L.PointExpression = [this.bioImageInfo.width, 0];

    this.map = L.map('leaflet-viewer', {
      crs: L.CRS.Simple,
      maxZoom: this.leafletService.calcMaxZoomLevel(this.bioImageInfo.width, this.bioImageInfo.height, this.tileSize),
      zoomControl: false
    });

    this.map.setView([0, 0], 0);
    
    const offset: number = this.tileSize * 5;
    const swMax: L.PointExpression = [sw[0] - offset, sw[1] + offset];
    const neMax: L.PointExpression = [ne[0] + offset, ne[1] - offset];
    this.map.setMaxBounds(this.leafletService.toLatLngBounds(swMax, neMax, this.map));

    L.tileLayer(`${environment.apiUrl}/api/images/${this.bioImageInfo.id}/tiles/{z}/{y}/{x}`, {
      bounds: this.leafletService.toLatLngBounds(sw, ne, this.map),
      tileSize: this.tileSize
    }).addTo(this.map);

    this.polygonLayer = L.layerGroup()
      .addTo(this.map);
   
    this.addControls()
  }

  private addControls(): void {
    L.control.zoom({
      position: 'bottomright'
    }).addTo(this.map);

    L.control.layers(undefined, {
      'Segments': this.polygonLayer
    }).addTo(this.map);

    const button: HTMLElement = L.DomUtil.create('a');
    button.setAttribute('data-bs-toggle', 'offcanvas');
    button.setAttribute('href', '#mask-manager-offcanvas');
    button.style.backgroundImage = 'url("/assets/polygon.png")';
    button.style.backgroundSize = '24px 24px';
    const maskButtonControl = this.leafletService.createButtonControl(button, "topleft");
    maskButtonControl.addTo(this.map);

    const imageNameControl = this.leafletService.createTextControl(this.bioImageInfo.originalName, "bottomleft");
    imageNameControl.addTo(this.map);
  }

  private updatePolygons(): void {
    this.polygonLayer.clearLayers();

    if (this.selectedMaskId !== null) {
      this.apiService.fetchPolygons(this.bioImageInfo.id, this.selectedMaskId!).subscribe(
        polygons => this.addPolygons(polygons),
        error => console.log(error)
      )
    }
  }

  private addPolygons(polygons: Polygon[]): void {
    polygons.forEach(polygon =>
      polygon.forEach((ring, index) => {
        const color: string = index > 0 ? 'red' : 'blue';
        const polygonMarker: L.Polygon = this.leafletService.createPolygonMarker(ring, color, this.map);
        polygonMarker.addTo(this.polygonLayer);
      })
    )
  }
}
