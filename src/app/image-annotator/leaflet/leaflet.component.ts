import { Input, Component, OnInit, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import { Geometry, Feature } from 'geojson';
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
  private drawFeatureControl!: L.Control;
  private cancelDrawFeatureControl!: L.Control;
  private removeAllInnerPolygonsControl!: L.Control;
  private featureEditUndoControl!: L.Control;
  private sw!: L.PointTuple;
  private ne!: L.PointTuple;
  private swMax!: L.PointTuple;
  private neMax!: L.PointTuple;
  private readonly tileSize: number = 128;
  private maxNativeZoom!: number;
  private drawModeEnabled: boolean = false;
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
        this.features.set(fid, feature);
        this.featureLayers.set(fid, layer);
        layer.bindPopup(this.createFeaturePopup(fid));
      },
      // @ts-ignore
      snapIgnore: true
    }).addTo(this.maskMap);

    this.maskMap.on('pm:create', (result) => {
      this.onPolygonCreated(result.layer);
    });

    this.initControls();
  }

  private fitContainer(): void {
    if (this.showBaseMap) {
      this.baseMap.invalidateSize();
    }
    this.maskMap.invalidateSize();
  }

  private toLatLng(point: L.PointTuple): L.LatLng {
    return this.maskMap.unproject(point, this.maxNativeZoom);
  }

  private toPoint(latLng: L.LatLng): L.Point {
    return this.maskMap.project(latLng, this.maxNativeZoom);
  }

  private addTileLayer(map: L.Map) {
    L.tileLayer(`${environment.apiUrl}/api/images/${this.bioImageInfo.id}/tiles/{z}/{y}/{x}`, {
      bounds: L.latLngBounds(this.toLatLng(this.sw), this.toLatLng(this.ne)),
      tileSize: this.tileSize,
      maxNativeZoom: this.maxNativeZoom
    }).addTo(map);
  }

  private createFeaturePopup(fid: number): HTMLElement {
    const popup = L.DomUtil.create('div');
    popup.appendChild(this.createFeatureGradePopupHtml(fid));
    popup.appendChild(this.createFeatureEditPopupHtml(fid));
    return popup;
  }

  private createFeatureEditPopupHtml(fid: number): HTMLElement {
    const feature = this.features.get(fid)!;
    const layer = this.featureLayers.get(fid)!;
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
      const deleteInnerContainer = L.DomUtil.create('div', 'mb-1', container);
      const deleteInnerButton = L.DomUtil.create('button', 'btn btn-danger', deleteInnerContainer);
      deleteInnerButton.innerHTML = 'Remove inner polygon(s)';
      deleteInnerButton.onclick = () => {
        this.addToFeatureEditUndoStack([feature]);
        this.removeInnerPolygons(fid, true);
      };
    }

    const editContainer = L.DomUtil.create('div', 'mb-1', container);
    const editButton = L.DomUtil.create('button', 'btn btn-primary', editContainer);
    editButton.innerHTML = 'Edit';
    editButton.onclick = () => {
      //this.addToFeatureEditUndoStack([feature]);
      layer.pm.enable({
        limitMarkersToCount: 10,
      })
    };

    return container;
  }

  private createFeatureGradePopupHtml(fid: number): HTMLElement {
    const feature = this.features.get(fid)!;
    const container: HTMLElement = document.createElement('div');

    const gradingContainer = L.DomUtil.create('div', 'mb-1 container', container);

    // True positives

    const truePositiveContainer = L.DomUtil.create('div', 'form-check', gradingContainer);
    const truePositive = L.DomUtil.create('input', 'form-check-input', truePositiveContainer) as HTMLInputElement;
    truePositive.type = 'radio';
    truePositive.name = `grading-radios-${fid}`;
    truePositive.id = `grading-radios-truepositive-${fid}`;

    const truePositiveLabel = L.DomUtil.create('label', 'form-check-label', truePositiveContainer) as HTMLLabelElement;
    truePositiveLabel.innerHTML = 'True positive';
    truePositiveLabel.htmlFor = truePositive.id;

    // False positives

    const falsePositiveContainer = L.DomUtil.create('div', 'form-check', gradingContainer);
    const falsePositive = L.DomUtil.create('input', 'form-check-input', falsePositiveContainer) as HTMLInputElement;
    falsePositive.type = 'radio';
    falsePositive.name = `grading-radios-${fid}`;
    falsePositive.id = `grading-radios-falsepositive-${fid}`;

    const falsePositiveLabel = L.DomUtil.create('label', 'form-check-label', falsePositiveContainer) as HTMLLabelElement;
    falsePositive.innerHTML = 'False positive';
    falsePositiveLabel.htmlFor = falsePositive.id;

    return container;
  }

  private initControls(): void {
    L.control.zoom({
      position: 'bottomright'
    }).addTo(this.maskMap);

    this.leafletService.createSplitScreenControl(() => this.toggleBaseMap()).addTo(this.maskMap);
    this.leafletService.createMaskControl().addTo(this.maskMap);

    this.drawFeatureControl = this.leafletService.createDrawFeatureControl(() => this.enableDrawMode());
    this.cancelDrawFeatureControl = this.leafletService.createCancelDrawFeatureControl(() => this.disableDrawMode());
    this.removeAllInnerPolygonsControl = this.leafletService.createRemoveAllInnerPolygonsControl(() => this.removeAllInnerPolygons());
    this.featureEditUndoControl = this.leafletService.createFeatureEditUndoControl(() => this.undoFeatureEdit());

    const imageNameControl = this.leafletService.createTextControl(this.bioImageInfo.originalName, 'bottomleft');
    imageNameControl.addTo(this.maskMap);
  }

  private updateTopLeftControls(): void {
    this.drawFeatureControl.remove();
    this.cancelDrawFeatureControl.remove();
    this.removeAllInnerPolygonsControl.remove();

    if (this.selectedMaskId === null) {
      return;
    }

    this.drawFeatureControl.addTo(this.maskMap);
    if (this.drawModeEnabled) {
      this.cancelDrawFeatureControl.addTo(this.maskMap);
    }

    this.removeAllInnerPolygonsControl.addTo(this.maskMap);
  }

  private handleMaskChange(maskId: string | null): void {
    this.selectedMaskId = maskId;
    this.updateGeoJson(maskId);
    this.updateTopLeftControls();
  }

  private updateGeoJson(maskId: string | null): void {
    this.features = new Map();
    this.featureLayers = new Map();
    this.geoJsonLayer.clearLayers();

    if (maskId !== null) {
      this.apiService.fetchGeoJson(this.bioImageInfo.id, maskId!).subscribe(
        features => this.geoJsonLayer.addData(features as any),
        error => window.alert('Failed to retrieve polygons from server!')
      )
    }
  }

  private enableDrawMode(): void {
    if (this.drawModeEnabled) {
      return;
    }
    this.drawModeEnabled = true;
    this.maskMap.pm.enableDraw('Polygon', {
      tooltips: false
    });
    this.updateTopLeftControls();
  }

  private disableDrawMode(): void {
    if (!this.disableDrawMode) {
      return;
    }
    this.drawModeEnabled = false;
    // @ts-ignore
    this.maskMap.pm.disableDraw();
    this.updateTopLeftControls();
  }

  private onPolygonCreated(layer: L.Layer): void {
    layer.remove();

    // @ts-ignore
    const latLngs: L.LatLng[] = layer._latlngs[0];
    const coords = latLngs.map(latLng => {
      const point = this.toPoint(latLng);
      return [point.x, point.y] as L.PointTuple;
    });

    const feature = this.leafletService.createGeoJsonFeature(coords);
    feature.properties.FID = this.features.size;
    this.geoJsonLayer.addData(feature);

    const prevFeature = JSON.parse(JSON.stringify(feature));
    prevFeature.type = null;
    this.addToFeatureEditUndoStack([prevFeature]);

    this.disableDrawMode();
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
      if (feature.type === null) {
        // Feature was created before undo, so remove it.
        this.removeFeature(feature.properties.FID);
        return;
      }

      const fid = feature.properties.FID;
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
}
