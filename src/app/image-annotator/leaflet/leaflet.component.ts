import { Input, Component, OnInit, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';

import { environment } from '../../../environments/environment';
import { HeaderService } from '../../header/header.service';
import { ApiService } from '../../services/api.service';
import { ImageInfo } from '../../types/image-info.type';
import { MaskManagerService } from '../mask-manager/mask-manager.service';
import { LeafletService } from './leaflet.service';
import { Geometry, Feature } from 'geojson';

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
  private features: Map<number, Feature<Geometry, any>> = new Map();
  private featureLayers: Map<number, L.Layer> = new Map();

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
      onEachFeature: (feature, layer) => {
        const fid = feature.properties.FID;
        this.featureLayers.set(fid, layer);
      }
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

  private updateControls(): void {
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
    this.features = new Map();
    this.featureLayers = new Map();
    this.geoJsonLayer.clearLayers();

    if (maskId !== null) {
      this.apiService.fetchGeoJson(this.bioImageInfo.id, maskId!).subscribe(
        features => {
          features.forEach(feature =>
            this.features.set(feature.properties.FID, feature)
          );
          this.geoJsonLayer.addData(features as any);
        },
        error => window.alert('Failed to retrieve polygons from server!')
      )
    }
  }

  private updateFeatureLayer(fid: number, openPopup: boolean = false): void {
    this.featureLayers.get(fid)?.remove();
    this.geoJsonLayer.addData(this.features.get(fid)!);

    const newLayer = this.featureLayers.get(fid)!;
    newLayer.bindPopup(this.createEditMaskPopup(fid));

    if (openPopup) {
      newLayer.openPopup();
    }
  }

  private removeInnerPolygons(fid: number): void {
    const feature = this.features.get(fid)!;
    
    const coords = (feature.geometry as any).coordinates as L.PointTuple[][];
    (feature.geometry as any).coordinates = [coords[0]];

    this.updateFeatureLayer(fid, true);
  }

  private startMaskEditMode(): void {
    if (this.maskEditModeEnabled) {
      return
    }

    this.maskEditModeEnabled = true;
    this.updateControls();

    this.featureLayers.forEach((layer, fid) => 
      layer.bindPopup(this.createEditMaskPopup(fid))
    )
  }

  private createEditMaskPopup(fid: number): HTMLElement {
    const feature = this.features.get(fid)!;
    const coords = (feature.geometry as any).coordinates as L.PointTuple[][];
    const hasInnerPolygon = coords.length > 1;

    const popup: HTMLElement = document.createElement('div');
    if (hasInnerPolygon) {
      const button: HTMLButtonElement = document.createElement('button');
      button.setAttribute('class', 'btn btn-primary');
      button.innerHTML = 'Delete inner polygon(s)'
      button.onclick = () => this.removeInnerPolygons(fid)
      popup.appendChild(button)
    }
    
    return popup;
  }

  private finishMaskEditMode(): void {
    if (!this.maskEditModeEnabled) {
      return
    }

    this.maskEditModeEnabled = false;
    this.updateControls();
  }

  private startMaskGradeMode(): void {
    if (this.maskGradeModeEnabled) {
      return
    }

    this.maskGradeModeEnabled = true;
    this.updateControls();
  }

  private finishMaskGradeMode(): void {
    if (!this.maskGradeModeEnabled) {
      return
    }

    this.maskGradeModeEnabled = false;
    this.updateControls();
  }

  private toLatLng(point: L.PointTuple): L.LatLng {
    return this.maskMap.unproject(point, this.maxNativeZoom);
  }
}
