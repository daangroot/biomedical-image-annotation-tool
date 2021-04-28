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
  private baseMap!: L.Map;
  private maskMap!: L.Map;
  private polygonLayer!: L.LayerGroup;
  private sw!: L.PointExpression;
  private ne!: L.PointExpression;
  private swMax!: L.PointExpression;
  private neMax!: L.PointExpression;
  private readonly tileSize: number = 256;
  showBaseMap: boolean = false;
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

    this.sw = [0, this.bioImageInfo.height];
    this.ne = [this.bioImageInfo.width, 0];
    const offset: number = this.tileSize * 5;
    this.swMax = [this.sw[0] - offset, this.sw[1] + offset];
    this.neMax = [this.ne[0] + offset, this.ne[1] - offset];
  }

  ngAfterViewInit(): void {
    this.initMaskMap();
  }

  toggleBaseMap(): void {
    this.showBaseMap = !this.showBaseMap;
    if (this.showBaseMap) {
      this.initBaseMap();
    } else {
      this.destroyBaseMap();
    }
    setTimeout(() => this.fitContainer(), 100);
  }

  private initBaseMap(): void {
    this.baseMap = this.createMap('leaflet-viewer-base', false, false);
    this.baseMap.setView(this.maskMap.getCenter(), this.maskMap.getZoom());
    this.baseMap.setMaxBounds(this.leafletService.toLatLngBounds(this.swMax, this.neMax, this.baseMap));

    this.addTileLayer(this.baseMap, this.sw, this.ne);

    this.maskMap.on('move', () =>
      this.baseMap.setView(this.maskMap.getCenter(), this.maskMap.getZoom())
    )
  }

  private destroyBaseMap(): void {
    this.baseMap.remove();
    this.maskMap.off('move');
  }

  private initMaskMap(): void {
    this.maskMap = this.createMap('leaflet-viewer-mask');
    this.maskMap.setView([0, 0], 0);
    this.maskMap.setMaxBounds(this.leafletService.toLatLngBounds(this.swMax, this.neMax, this.maskMap));

    this.addTileLayer(this.maskMap, this.sw, this.ne);

    this.polygonLayer = L.layerGroup()
      .addTo(this.maskMap);

    this.addMaskMapControls();
  }

  private fitContainer(): void {
    if (this.showBaseMap) {
      this.baseMap.invalidateSize();
    }
    this.maskMap.invalidateSize();
  }

  private createMap(htmlId: string, canDrag: boolean = true, canScroll: boolean = true): L.Map {
    return L.map(htmlId, {
      crs: L.CRS.Simple,
      maxZoom: this.leafletService.calcMaxZoomLevel(this.bioImageInfo.width, this.bioImageInfo.height, this.tileSize),
      zoomControl: false,
      dragging: canDrag,
      scrollWheelZoom: canScroll
    });
  }

  private addTileLayer(map: L.Map, sw: L.PointExpression, ne: L.PointExpression) {
    L.tileLayer(`${environment.apiUrl}/api/images/${this.bioImageInfo.id}/tiles/{z}/{y}/{x}`, {
      bounds: this.leafletService.toLatLngBounds(sw, ne, map),
      tileSize: this.tileSize
    }).addTo(map);
  }

  private addMaskMapControls(): void {
    L.control.zoom({
      position: 'bottomright'
    }).addTo(this.maskMap);

    L.control.layers(undefined, {
      'Segments': this.polygonLayer
    }).addTo(this.maskMap);

    const splitScreenControl = this.createSplitScreenControl();
    splitScreenControl.addTo(this.maskMap);

    const maskControl = this.createMaskControl();
    maskControl.addTo(this.maskMap);

    const imageNameControl = this.leafletService.createTextControl(this.bioImageInfo.originalName, "bottomleft");
    imageNameControl.addTo(this.maskMap);
  }

  private createSplitScreenControl(): L.Control {
    const button: HTMLElement = L.DomUtil.create('a');
    button.onclick = () => this.toggleBaseMap();
    button.setAttribute('title', 'Split screen');
    button.style.backgroundImage = 'url("/assets/swap_horiz.png")';
    button.style.backgroundSize = '24px 24px';
    return this.leafletService.createButtonControl(button, "topleft");
  }

  private createMaskControl(): L.Control {
    const button: HTMLElement = L.DomUtil.create('a');
    button.setAttribute('data-bs-toggle', 'offcanvas');
    button.setAttribute('href', '#mask-manager-offcanvas');
    button.setAttribute('title', 'Set mask');
    button.style.backgroundImage = 'url("/assets/layers.png")';
    button.style.backgroundSize = '24px 24px';
    return this.leafletService.createButtonControl(button, "topleft");
  }

  private updatePolygons(): void {
    this.polygonLayer.clearLayers();

    if (this.selectedMaskId !== null) {
      this.apiService.fetchPolygons(this.bioImageInfo.id, this.selectedMaskId!).subscribe(
        polygons => this.addPolygons(polygons),
        error => window.alert('Failed to retrieve polygons from server!')
      )
    }
  }

  private addPolygons(polygons: Polygon[]): void {
    polygons.forEach(polygon =>
      polygon.forEach((ring, index) => {
        const color: string = index > 0 ? 'red' : 'blue';
        const polygonMarker: L.Polygon = this.leafletService.createPolygonMarker(ring, color, this.maskMap);
        polygonMarker.addTo(this.polygonLayer);
      })
    )
  }
}
