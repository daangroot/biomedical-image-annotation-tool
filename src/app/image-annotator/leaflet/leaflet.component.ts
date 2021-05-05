import { Input, Component, OnInit, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';

import { environment } from '../../../environments/environment';
import { HeaderService } from '../../header/header.service';
import { ApiService } from '../../services/api.service';
import { ImageInfo } from '../../types/image-info.type';
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
  showBaseMap: boolean = false;
  private selectedMaskId: string | null = null;
  private baseMap!: L.Map;
  private maskMap!: L.Map;
  private geoJsonLayer!: L.GeoJSON;
  private maskControl!: L.Control;
  private editMaskControl!: L.Control;
  private gradeMaskControl!: L.Control;
  private finishActionControl!: L.Control;
  private sw!: L.PointTuple;
  private ne!: L.PointTuple;
  private swMax!: L.PointTuple;
  private neMax!: L.PointTuple;
  private readonly tileSize: number = 128;
  private maxNativeZoom!: number;
  private maskEditModeEnabled: boolean = false;
  private maskGradeModeEnabled: boolean = false;

  constructor(
    private apiService: ApiService,
    private headerService: HeaderService,
    private leafletService: LeafletService,
    private maskManagerService: MaskManagerService
  ) { }

  ngOnInit(): void {
    this.maskManagerService.maskSelected$.subscribe(
      id => this.handleMaskChange(id)
    )

    this.leafletContainerCssHeight = `calc(100% - ${this.headerService.headerHeight}px)`;

    this.sw = [0, this.bioImageInfo.height];
    this.ne = [this.bioImageInfo.width, 0];
    const offset: number = this.tileSize * 5;
    this.swMax = [this.sw[0] - offset, this.sw[1] + offset];
    this.neMax = [this.ne[0] + offset, this.ne[1] - offset];

    this.maxNativeZoom = this.leafletService.calcMaxNativeZoomLevel(this.bioImageInfo.width, this.bioImageInfo.height, this.tileSize);
  }

  ngAfterViewInit(): void {
    this.initMaskMap();
  }

  private initBaseMap(): void {
    this.baseMap = this.leafletService.createMap('leaflet-viewer-base', false);
    this.addTileLayer(this.baseMap);

    this.maskMap.on('move', () =>
      this.baseMap.setView(this.maskMap.getCenter(), this.maskMap.getZoom())
    )
  }

  private destroyBaseMap(): void {
    this.baseMap.remove();
    this.maskMap.off('move');
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

  private initMaskMap(): void {
    this.maskMap = this.leafletService.createMap('leaflet-viewer-mask');
    this.maskMap.setView([0, 0], 0);
    this.maskMap.setMaxBounds(L.latLngBounds(this.toLatLng(this.swMax), this.toLatLng(this.neMax)));

    this.addTileLayer(this.maskMap);

    this.geoJsonLayer = L.geoJSON(undefined, {
      coordsToLatLng: (coords) => this.toLatLng(coords as L.PointTuple),
      onEachFeature: this.onEachFeature
    }).addTo(this.maskMap);

    this.addMaskMapControls();
  }

  private fitContainer(): void {
    if (this.showBaseMap) {
      this.baseMap.invalidateSize();
    }
    this.maskMap.invalidateSize();
  }

  private addTileLayer(map: L.Map) {
    L.tileLayer(`${environment.apiUrl}/api/images/${this.bioImageInfo.id}/tiles/{z}/{y}/{x}`, {
      bounds: L.latLngBounds(this.toLatLng(this.sw), this.toLatLng(this.ne)),
      tileSize: this.tileSize,
      maxNativeZoom: this.maxNativeZoom
    }).addTo(map);
  }

  private addMaskMapControls(): void {
    L.control.zoom({
      position: 'bottomright'
    }).addTo(this.maskMap);

    const splitScreenControl = this.createSplitScreenControl();
    splitScreenControl.addTo(this.maskMap);

    this.maskControl = this.createMaskControl();
    this.maskControl.addTo(this.maskMap);

    this.editMaskControl = this.createEditMaskControl();
    this.gradeMaskControl = this.createGradeMaskControl();
    this.finishActionControl = this.createActionOperationControl();

    const imageNameControl = this.leafletService.createTextControl(this.bioImageInfo.originalName, 'bottomleft');
    imageNameControl.addTo(this.maskMap);
  }

  private createSplitScreenControl(): L.Control {
    const button: HTMLElement = L.DomUtil.create('a');
    button.onclick = () => this.toggleBaseMap();
    button.setAttribute('title', 'Split screen');
    button.style.backgroundImage = 'url("/assets/swap_horiz.png")';
    button.style.backgroundSize = '24px 24px';
    return this.leafletService.createButtonControl(button, 'topleft');
  }

  private createMaskControl(): L.Control {
    const button: HTMLElement = L.DomUtil.create('a');
    button.setAttribute('data-bs-toggle', 'offcanvas');
    button.setAttribute('href', '#mask-manager-offcanvas');
    button.setAttribute('title', 'Set mask');
    button.style.backgroundImage = 'url("/assets/layers.png")';
    button.style.backgroundSize = '24px 24px';
    return this.leafletService.createButtonControl(button, 'topleft');
  }

  private createEditMaskControl(): L.Control {
    const button: HTMLElement = L.DomUtil.create('a');
    button.onclick = () => this.startMaskEditMode();
    button.setAttribute('title', 'Edit');
    button.style.backgroundImage = 'url("/assets/edit.png")';
    button.style.backgroundSize = '24px 24px';
    return this.leafletService.createButtonControl(button, 'topleft');
  }

  private createGradeMaskControl(): L.Control {
    const button: HTMLElement = L.DomUtil.create('a');
    button.onclick = () => this.startMaskGradeMode();
    button.setAttribute('title', 'Grade');
    button.style.backgroundImage = 'url("/assets/grade.png")';
    button.style.backgroundSize = '24px 24px';
    return this.leafletService.createButtonControl(button, 'topleft');
  }

  private createActionOperationControl(): L.Control {
    const button: HTMLElement = L.DomUtil.create('a');
    button.onclick = () => {
      if (this.maskEditModeEnabled) {
        this.finishMaskEditMode();
      } else {
        this.finishMaskGradeMode();
      }
    }
    button.setAttribute('title', 'Finish');
    button.style.backgroundImage = 'url("/assets/done.png")';
    button.style.backgroundSize = '24px 24px';
    return this.leafletService.createButtonControl(button, 'topleft');
  }

  private updateControls() {
    this.maskControl.remove();
    this.editMaskControl.remove();
    this.gradeMaskControl.remove();
    this.finishActionControl.remove();

    if (!this.maskEditModeEnabled && !this.maskGradeModeEnabled) {
      this.maskControl.addTo(this.maskMap);
    }

    if (this.selectedMaskId !== null && !this.maskGradeModeEnabled) {
      this.editMaskControl.addTo(this.maskMap);
    }

    if (this.selectedMaskId !== null && !this.maskEditModeEnabled) {
      this.gradeMaskControl.addTo(this.maskMap);
    }

    if (this.maskEditModeEnabled || this.maskGradeModeEnabled) {
      this.finishActionControl.addTo(this.maskMap);
    }
  }

  private handleMaskChange(maskId: string | null): void {
    this.selectedMaskId = maskId;
    this.updateGeoJson(maskId);
    this.updateControls();
  }

  private updateGeoJson(maskId: string | null): void {
    this.geoJsonLayer.clearLayers();

    if (maskId !== null) {
      this.apiService.fetchGeoJson(this.bioImageInfo.id, maskId!).subscribe(
        geoJsonPolygons => this.geoJsonLayer.addData(geoJsonPolygons as any),
        error => window.alert('Failed to retrieve polygons from server!')
      )
    }
  }

  private startMaskEditMode() {
    if (this.maskEditModeEnabled) {
      return
    }

    this.maskEditModeEnabled = true;
    this.updateControls();
  }

  private finishMaskEditMode() {
    if (!this.maskEditModeEnabled) {
      return
    }

    this.maskEditModeEnabled = false;
    this.updateControls();
  }

  private startMaskGradeMode() {
    if (this.maskGradeModeEnabled) {
      return
    }

    this.maskGradeModeEnabled = true;
    this.updateControls();
  }

  private finishMaskGradeMode() {
    if (!this.maskGradeModeEnabled) {
      return
    }

    this.maskGradeModeEnabled = false;
    this.updateControls();
  }

  private toLatLng(point: L.PointTuple): L.LatLng {
    return this.maskMap.unproject(point, this.maxNativeZoom);
  }

  private onEachFeature(feature: any, layer: any) {
    layer.bindPopup(feature.type);
  }
}
