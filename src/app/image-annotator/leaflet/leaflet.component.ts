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
  private removeAllInnerPolygonsControl!: L.Control;
  private featureEditUndoControl!: L.Control;
  private sw!: L.PointTuple;
  private ne!: L.PointTuple;
  private swMax!: L.PointTuple;
  private neMax!: L.PointTuple;
  private readonly tileSize: number = 128;
  private maxNativeZoom!: number;
  private features: Map<number, Feature<Geometry, any>> = new Map();
  private featureLayers: Map<number, L.Layer> = new Map();
  private featureEditUndoStack: Feature<Geometry, any>[][] = [];

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

    this.createSplitScreenControl().addTo(this.maskMap);
    this.createMaskControl().addTo(this.maskMap);

    this.removeAllInnerPolygonsControl = this.createRemoveAllInnerPolygonsControl();
    this.featureEditUndoControl = this.createFeatureEditUndoControl();

    const imageNameControl = this.leafletService.createTextControl(this.bioImageInfo.originalName, 'bottomleft');
    imageNameControl.addTo(this.maskMap);
  }

  private createSplitScreenControl(): L.Control {
    const button = L.DomUtil.create('a');
    button.onclick = () => this.toggleBaseMap();
    button.setAttribute('title', 'Split screen');
    button.style.backgroundImage = 'url("/assets/swap_horiz.png")';
    button.style.backgroundSize = '24px 24px';
    L.DomEvent.disableClickPropagation(button);
    return this.leafletService.createButtonControl(button, 'topleft');
  }

  private createMaskControl(): L.Control {
    const button = L.DomUtil.create('a');
    button.setAttribute('data-bs-toggle', 'offcanvas');
    button.setAttribute('href', '#mask-manager-offcanvas');
    button.setAttribute('title', 'Set mask');
    button.style.backgroundImage = 'url("/assets/layers.png")';
    button.style.backgroundSize = '24px 24px';
    L.DomEvent.disableClickPropagation(button);
    return this.leafletService.createButtonControl(button, 'topleft');
  }

  private createRemoveAllInnerPolygonsControl(): L.Control {
    const button = L.DomUtil.create('a');
    button.onclick = () => this.removeAllInnerPolygons();
    button.setAttribute('title', 'Remove all inner polygons');
    button.style.backgroundImage = 'url("/assets/delete_inner_polygons.png")';
    button.style.backgroundSize = '24px 24px';
    L.DomEvent.disableClickPropagation(button);
    return this.leafletService.createButtonControl(button, 'topleft');
  }

  private createFeatureEditUndoControl(): L.Control {
    const button = L.DomUtil.create('a');
    button.onclick = () => this.undoFeatureEdit();
    button.setAttribute('title', 'Undo');
    button.style.backgroundImage = 'url("/assets/undo.png")';
    button.style.backgroundSize = '24px 24px';
    L.DomEvent.disableClickPropagation(button);
    return this.leafletService.createButtonControl(button, 'topright');
  }

  private handleMaskChange(maskId: string | null): void {
    if (maskId !== null) {
      this.removeAllInnerPolygonsControl.addTo(this.maskMap);
    } else if (maskId === null) {
      this.removeAllInnerPolygonsControl.remove();
    }

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

  private removeFeature(fid: number) {
    this.featureLayers.get(fid)?.remove();
    this.features.delete(fid);
    this.featureLayers.delete(fid);
  }

  private removeInnerPolygons(fid: number, openPopup: boolean = false) {
    const feature = this.features.get(fid)!;
    
    if (feature.geometry.type === 'Polygon') {
      feature.geometry.coordinates = [feature.geometry.coordinates[0]];
    } else if (feature.geometry.type === 'MultiPolygon') {
      feature.geometry.coordinates = [feature.geometry.coordinates[0][0]] as any;
      feature.geometry.type = 'Polygon' as any;
    }

    this.updateFeatureLayer(fid, openPopup);
  }

  private removeAllInnerPolygons(): void {
    const featuresWithInner: Feature[] = [];

    this.features.forEach(feature => {
      const hasInnerPolygon = (feature.geometry as any).coordinates.length > 1;
      if (hasInnerPolygon) {
        featuresWithInner.push(JSON.parse(JSON.stringify(feature)));
        this.removeInnerPolygons(feature.properties.FID);
      }
    })

    this.addToFeatureEditUndoStack(featuresWithInner);
  }

  private createFeaturePopup(fid: number): HTMLElement {
    const popup = L.DomUtil.create('div');
    popup.appendChild(this.createFeatureEditPopupHtml(fid));
    popup.appendChild(this.createFeatureGradePopupHtml(fid));
    return popup;
  }

  private createFeatureEditPopupHtml(fid: number): HTMLElement {
    const feature = this.features.get(fid)!;
    const container = L.DomUtil.create('div');

    const deleteContainer = L.DomUtil.create('div', 'mb-1', container);
    const deleteButton = L.DomUtil.create('button', 'btn btn-danger', deleteContainer);
    deleteButton.innerHTML = 'Remove';
    deleteButton.onclick = () => {
      this.addToFeatureEditUndoStack([feature]);
      this.removeFeature(fid);
    };

    const hasInnerPolygon = (feature.geometry as any).coordinates.length > 1;
    if (hasInnerPolygon) {
      const deleteInnerContainer = L.DomUtil.create('div', '', container);
      const deleteInnerButton = L.DomUtil.create('button', 'btn btn-danger', deleteInnerContainer);
      deleteInnerButton.innerHTML = 'Remove inner polygon(s)';
      deleteInnerButton.onclick = () => {
        this.addToFeatureEditUndoStack([feature]);
        this.removeInnerPolygons(fid, true);
      };
    }

    return container;
  }

  private createFeatureGradePopupHtml(fid: number): HTMLElement {
    const div: HTMLElement = document.createElement('div');
    return div;
  }

  private addToFeatureEditUndoStack(features: Feature<Geometry, any>[]): void {
    if (features.length === 0) {
      return;
    }

    const copy = JSON.parse(JSON.stringify(features));
    this.featureEditUndoStack.push(copy);

    this.featureEditUndoControl.addTo(this.maskMap);
  }

  private undoFeatureEdit(): void {
    if (this.featureEditUndoStack.length === 0) {
      return;
    }

    const prevFeatures = this.featureEditUndoStack.pop()!;
    prevFeatures.forEach(feature => {
      const fid = feature.properties.FID as number;
      this.features.set(fid, feature);
      this.updateFeatureLayer(fid);

      const layer = this.featureLayers.get(fid) as any;
      if (prevFeatures.length === 1) {
        const bounds = layer.getBounds() as L.LatLngBounds;
        this.maskMap.panTo(bounds.getCenter());
      }
      layer.setStyle({
        color: 'yellow'
      });
      setTimeout(() => {
        this.geoJsonLayer.resetStyle(layer);
      }, 1500);
    })
    
    if (this.featureEditUndoStack.length === 0) {
      this.featureEditUndoControl.remove();
    }
  }

  private toLatLng(point: L.PointTuple): L.LatLng {
    return this.maskMap.unproject(point, this.maxNativeZoom);
  }
}
