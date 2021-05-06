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
  private featureUndoControl!: L.Control;
  private sw!: L.PointTuple;
  private ne!: L.PointTuple;
  private swMax!: L.PointTuple;
  private neMax!: L.PointTuple;
  private readonly tileSize: number = 128;
  private maxNativeZoom!: number;
  private features: Map<number, Feature<Geometry, any>> = new Map();
  private featureLayers: Map<number, L.Layer> = new Map();
  private featureUndoStack: Feature<Geometry, any>[] = [];

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
        layer.bindPopup(this.createFeaturePopup(fid));
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

    this.featureUndoControl = this.createFeatureUndoControl();

    const imageNameControl = this.leafletService.createTextControl(this.bioImageInfo.originalName, 'bottomleft');
    imageNameControl.addTo(this.maskMap);
  }

  private createSplitScreenControl(): L.Control {
    const button: HTMLElement = document.createElement('a');
    button.onclick = () => this.toggleBaseMap();
    button.setAttribute('title', 'Split screen');
    button.style.backgroundImage = 'url("/assets/swap_horiz.png")';
    button.style.backgroundSize = '24px 24px';
    return this.leafletService.createButtonControl(button, 'topleft');
  }

  private createMaskControl(): L.Control {
    const button: HTMLElement = document.createElement('a');
    button.setAttribute('data-bs-toggle', 'offcanvas');
    button.setAttribute('href', '#mask-manager-offcanvas');
    button.setAttribute('title', 'Set mask');
    button.style.backgroundImage = 'url("/assets/layers.png")';
    button.style.backgroundSize = '24px 24px';
    return this.leafletService.createButtonControl(button, 'topleft');
  }

  private createFeatureUndoControl(): L.Control {
    const button: HTMLElement = document.createElement('a');
    button.onclick = () => this.undoFeatureEdit();
    button.setAttribute('title', 'Undo');
    button.style.backgroundImage = 'url("/assets/undo.png")';
    button.style.backgroundSize = '24px 24px';
    return this.leafletService.createButtonControl(button, 'topright');
  }

  private handleMaskChange(maskId: string | null): void {
    this.selectedMaskId = maskId;
    this.updateGeoJson(maskId);
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

    if (openPopup) {
      this.featureLayers.get(fid)!.openPopup();
    }
  }

  private removeInnerPolygons(fid: number): void {
    const feature = this.features.get(fid)!;
    this.addToUndoStack(feature);

    if (feature.geometry.type === 'Polygon') {
      feature.geometry.coordinates = [feature.geometry.coordinates[0]];
    } else if (feature.geometry.type === 'MultiPolygon') {
      feature.geometry.coordinates = [feature.geometry.coordinates[0][0]] as any;
      feature.geometry.type = 'Polygon' as any;
    }

    this.updateFeatureLayer(fid, true);
  }

  private createFeaturePopup(fid: number): HTMLElement {
    const popup: HTMLElement = document.createElement('div');
    popup.appendChild(this.createFeatureEditPopupHtml(fid));
    popup.appendChild(this.createFeatureGradePopupHtml(fid));
    return popup;
  }

  private createFeatureEditPopupHtml(fid: number): HTMLElement {
    const feature = this.features.get(fid)!;
    const coords = (feature.geometry as any).coordinates as L.PointTuple[][];
    const hasInnerPolygon = coords.length > 1;

    const div: HTMLElement = document.createElement('div');
    if (hasInnerPolygon) {
      const button: HTMLButtonElement = document.createElement('button');
      button.setAttribute('class', 'btn btn-primary');
      button.innerHTML = 'Delete inner polygon(s)';
      button.onclick = () => this.removeInnerPolygons(fid);
      div.appendChild(button);
    }

    return div;
  }

  private createFeatureGradePopupHtml(fid: number): HTMLElement {
    const div: HTMLElement = document.createElement('div');
    return div;
  }

  private addToUndoStack(feature: Feature<Geometry, any>): void {
    const copy = JSON.parse(JSON.stringify(feature));
    this.featureUndoStack.push(copy);

    if (this.featureUndoStack.length === 1) {
      this.featureUndoControl.addTo(this.maskMap);
    }
  }

  private undoFeatureEdit(): void {
    if (this.featureUndoStack.length === 0) {
      return;
    }

    const prevFeature = this.featureUndoStack.pop()!;
    const fid = prevFeature.properties.FID as number;
    this.features.set(fid, prevFeature);
    this.updateFeatureLayer(fid);

    const layer = this.featureLayers.get(fid) as any;
    const bounds = layer.getBounds() as L.LatLngBounds;
    this.maskMap.panTo(bounds.getCenter())
    layer.setStyle({
      color: 'yellow'
    })
    setTimeout(() => {
      this.geoJsonLayer.resetStyle(layer);
    }, 1500)

    if (this.featureUndoStack.length === 0) {
      this.featureUndoControl.remove();
    }
  }

  private toLatLng(point: L.PointTuple): L.LatLng {
    return this.maskMap.unproject(point, this.maxNativeZoom);
  }
}
