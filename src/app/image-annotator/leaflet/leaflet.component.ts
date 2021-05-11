import { Input, Component, OnInit, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import { Feature, Polygon, MultiPolygon } from 'geojson';
import { environment } from '../../../environments/environment';
import { HeaderService } from '../../header/header.service';
import { ApiService } from '../../services/api.service';
import { ImageInfo } from '../../types/image-info.type';
import { FeatureGrade } from '../../types/feature-grade.type';
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
  private showTopLeftControlsControl!: L.Control;
  private hideTopLeftControlsControl!: L.Control;
  private splitScreenControl!: L.Control;
  private maskControl!: L.Control;
  private drawFeatureControl!: L.Control;
  private cancelDrawFeatureControl!: L.Control;
  private cutFeatureControl!: L.Control;
  private cancelCutFeatureControl!: L.Control
  private simplifyAllPolygonsControl!: L.Control;
  private removeAllInnerRingsControl!: L.Control;
  private featureEditUndoControl!: L.Control;
  private sw!: L.PointTuple;
  private ne!: L.PointTuple;
  private swMax!: L.PointTuple;
  private neMax!: L.PointTuple;
  private maxNativeZoom!: number;
  private showTopLeftControls: boolean = true;
  private drawModeEnabled: boolean = false;
  private cutModeEnabled: boolean = false;
  private maxFid: number = -1;
  private features: Map<number, Feature<Polygon, any>> = new Map();
  private featureLayers: Map<number, L.Layer> = new Map();
  private featureEditUndoStack: Feature<Polygon, any>[][] = [];
  private readonly tileSize: number = 128;
  private readonly maxSimplifyTolerance: number = 10000;

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
    this.leafletService.setMaxNativeZoom(this.maxNativeZoom);

    this.splitScreenControl = this.leafletService.createSplitScreenControl(() => this.toggleBaseMap());
    this.maskControl = this.leafletService.createMaskControl();
    this.showTopLeftControlsControl = this.leafletService.createShowControlsControl(() => this.toggleTopLeftControls());
    this.hideTopLeftControlsControl = this.leafletService.createHideControlsControl(() => this.toggleTopLeftControls());
    this.drawFeatureControl = this.leafletService.createDrawFeatureControl(() => this.enableDrawMode());
    this.cancelDrawFeatureControl = this.leafletService.createCancelDrawFeatureControl(() => this.disableDrawMode());
    this.cutFeatureControl = this.leafletService.createCutFeatureControl(() => this.enableCutMode());
    this.cancelCutFeatureControl = this.leafletService.createCancelCutFeatureControl(() => this.disableCutMode());
    this.simplifyAllPolygonsControl = this.leafletService.createSimplifyAllFeaturesControl(() => this.simplifyAllFeatures());
    this.removeAllInnerRingsControl = this.leafletService.createRemoveAllInnerRingsControl(() => this.removeAllInnerRings());
    this.featureEditUndoControl = this.leafletService.createFeatureEditUndoControl(() => this.undoFeatureEdit());
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
    this.leafletService.setMap(this.maskMap);
    this.maskMap.setView([0, 0], 0);
    this.maskMap.setMaxBounds(L.latLngBounds(this.leafletService.toLatLng(this.swMax), this.leafletService.toLatLng(this.neMax)));

    this.addTileLayer(this.maskMap);

    this.geoJsonLayer = L.geoJSON(undefined, {
      coordsToLatLng: (coords: L.PointTuple) => this.leafletService.toLatLng(coords),
      onEachFeature: (feature: Feature<Polygon, any>, layer) => this.onEachFeature(feature, layer),
      // @ts-ignore
      snapIgnore: true
    }).addTo(this.maskMap);

    this.maskMap.on('pm:create', (result) => {
      this.createFeature(result.layer);
      this.disableDrawMode();
    });

    this.maskMap.on('pm:cut', (result) => {
      // @ts-ignore
      this.cutFeature(result.layer.feature, result.originalLayer.feature);
      this.disableCutMode();
    });

    this.addControls();
  }

  private fitContainer(): void {
    if (this.showBaseMap) {
      this.baseMap.invalidateSize();
    }
    this.maskMap.invalidateSize();
  }

  private addTileLayer(map: L.Map) {
    L.tileLayer(`${environment.apiUrl}/api/images/${this.bioImageInfo.id}/tiles/{z}/{y}/{x}`, {
      bounds: L.latLngBounds(this.leafletService.toLatLng(this.sw), this.leafletService.toLatLng(this.ne)),
      tileSize: this.tileSize,
      maxNativeZoom: this.maxNativeZoom
    }).addTo(map);
  }

  private createFeaturePopup(fid: number): HTMLElement {
    const popup = L.DomUtil.create('div');
    popup.id = 'fid-' + fid;
    popup.appendChild(this.createFeatureGradePopupHtml(fid));
    popup.appendChild(this.createFeatureEditPopupHtml(fid));
    return popup;
  }

  private createFeatureEditPopupHtml(fid: number): HTMLElement {
    const feature = this.features.get(fid)!;
    const layer = this.featureLayers.get(fid)!;
    const container = L.DomUtil.create('div');

    const editSimplifyContainer = L.DomUtil.create('div', 'mb-2', container);
    const editButton = L.DomUtil.create('button', 'btn btn-primary me-2', editSimplifyContainer);
    editButton.innerHTML = 'Edit';
    editButton.onclick = () => {
      editButton.hidden = true;
      finishEditButton.hidden = false;
      layer.pm.enable({
        allowSelfIntersection: false,
        limitMarkersToCount: 256
      })
    };

    const finishEditButton = L.DomUtil.create('button', 'btn btn-primary me-2', editSimplifyContainer);
    finishEditButton.innerHTML = 'Finish edit';
    finishEditButton.hidden = true
    finishEditButton.onclick = () => {
      editButton.hidden = false;
      finishEditButton.hidden = true;
      layer.pm.disable();
    };

    if (this.leafletService.hasNonTriangularRing(feature) && feature.properties.simplifyTolerance <= this.maxSimplifyTolerance) {
      const simplifyButton = L.DomUtil.create('button', 'btn btn-primary me-2', editSimplifyContainer);
      simplifyButton.innerHTML = feature.properties.simplifyTolerance === 0 ? 'Simplify' : 'Simplify more';
      simplifyButton.onclick = () => {
        this.addToFeatureEditUndoStack([feature]);
        this.simplifyFeature(fid, true);
      };
    }

    const innerRingCount = feature.geometry.coordinates.length - 1;
    if (innerRingCount > 0) {
      const deleteInnerContainer = L.DomUtil.create('div', 'mb-2', container);
      const deleteInnerButton = L.DomUtil.create('button', 'btn btn-danger', deleteInnerContainer);
      deleteInnerButton.innerHTML = innerRingCount === 1 ? 'Remove inner ring' : 'Remove inner rings';
      deleteInnerButton.onclick = () => {
        this.addToFeatureEditUndoStack([feature]);
        this.removeInnerRings(fid, true);
      };
    }

    const deleteContainer = L.DomUtil.create('div', 'mb-2', container);
    const deleteButton = L.DomUtil.create('button', 'btn btn-danger', deleteContainer);
    deleteButton.innerHTML = 'Remove';
    deleteButton.onclick = () => {
      this.addToFeatureEditUndoStack([feature]);
      this.removeFeature(fid);
    };

    return container;
  }

  private createFeatureGradePopupHtml(fid: number): HTMLElement {
    const feature = this.features.get(fid)!;
    const gradingContainer = L.DomUtil.create('div', 'mb-3');

    // Segment score

    const scoreLabel = L.DomUtil.create('label', 'form-label', gradingContainer) as HTMLLabelElement;
    scoreLabel.htmlFor = `segment-score-${fid}`;
    scoreLabel.innerHTML = 'Segment score';

    const scoreContainer = L.DomUtil.create('div', 'input-group mb-2', gradingContainer);

    const scoreInput = L.DomUtil.create('input', 'form-control', scoreContainer) as HTMLInputElement;
    scoreInput.type = 'number';
    scoreInput.min = '0';
    scoreInput.max = '100';
    scoreInput.placeholder = 'Segment score';
    scoreInput.id = `segment-score-${fid}`;
    scoreInput.oninput = (event: Event) => {
      const scoreInput = event.target as HTMLInputElement;
      this.setFeatureScore(fid, scoreInput.value);
    }
    if (feature.properties.score != null) {
      scoreInput.value = feature.properties.score.toString();
    }

    const scoreText = L.DomUtil.create('span', 'input-group-text', scoreContainer);
    scoreText.innerHTML = '%';

    // Grading

    const gradeSelect = L.DomUtil.create('select', 'form-select', gradingContainer) as HTMLSelectElement;

    L.DomUtil.create('option', undefined, gradeSelect);

    const truePositive = L.DomUtil.create('option', undefined, gradeSelect) as HTMLOptionElement;
    truePositive.innerHTML = 'True positive';
    truePositive.selected = feature.properties.grade === FeatureGrade.TruePositive;

    const falsePositive = L.DomUtil.create('option', undefined, gradeSelect) as HTMLOptionElement;
    falsePositive.innerHTML = 'False positive';
    falsePositive.selected = feature.properties.grade === FeatureGrade.FalsePositive;

    gradeSelect.oninput = () => {
      let grade;
      if (truePositive.selected) {
        grade = FeatureGrade.TruePositive;
      } else if (falsePositive.selected) {
        grade = FeatureGrade.FalsePositive;
      }
      if (grade != null) {
        this.setFeatureGrade(fid, grade);
      }
    }

    return gradingContainer;
  }

  private setFeatureScore(fid: number, scoreString: string): void {
    try {
      const score = parseInt(scoreString);
      const feature = this.features.get(fid)!;
      feature.properties.score = score;
    }
    catch {}
  }

  private setFeatureGrade(fid: number, grade: FeatureGrade): void {
    const feature = this.features.get(fid)!;
    feature.properties.grade = grade;
    this.updateFeatureLayer(fid, true);
  }

  private addControls(): void {
    L.control.zoom({
      position: 'bottomright'
    }).addTo(this.maskMap);

    this.leafletService.createTextControl(this.bioImageInfo.originalName, 'bottomleft').addTo(this.maskMap);

    this.updateTopLeftControls();
  }

  private updateTopLeftControls(): void {
    this.showTopLeftControlsControl.remove();
    this.hideTopLeftControlsControl.remove();
    this.splitScreenControl.remove();
    this.maskControl.remove();
    this.drawFeatureControl.remove();
    this.cancelDrawFeatureControl.remove();
    this.cutFeatureControl.remove();
    this.cancelCutFeatureControl.remove();
    this.simplifyAllPolygonsControl.remove();
    this.removeAllInnerRingsControl.remove();

    if (!this.showTopLeftControls) {
      this.showTopLeftControlsControl.addTo(this.maskMap);
      return;
    }

    this.hideTopLeftControlsControl.addTo(this.maskMap);
    this.splitScreenControl.addTo(this.maskMap);
    this.maskControl.addTo(this.maskMap);

    if (this.selectedMaskId === null) {
      return;
    }

    this.drawFeatureControl.addTo(this.maskMap);
    if (this.drawModeEnabled) {
      this.cancelDrawFeatureControl.addTo(this.maskMap);
    }

    this.cutFeatureControl.addTo(this.maskMap);
    if (this.cutModeEnabled) {
      this.cancelCutFeatureControl.addTo(this.maskMap);
    }

    this.simplifyAllPolygonsControl.addTo(this.maskMap);
    this.removeAllInnerRingsControl.addTo(this.maskMap);
  }

  private toggleTopLeftControls() {
    this.showTopLeftControls = !this.showTopLeftControls;
    this.updateTopLeftControls();
  }

  private enableDrawMode(): void {
    if (this.drawModeEnabled) {
      return;
    }
    if (this.cutModeEnabled) {
      this.disableCutMode();
    }
    this.drawModeEnabled = true;
    this.updateTopLeftControls();

    this.maskMap.pm.enableDraw('Polygon', {
      // @ts-ignore
      allowSelfIntersection: false,
      tooltips: false
    });
  }

  private disableDrawMode(): void {
    if (!this.disableDrawMode) {
      return;
    }
    this.drawModeEnabled = false;
    this.updateTopLeftControls();
    // @ts-ignore
    this.maskMap.pm.disableDraw();
  }

  private enableCutMode(): void {
    if (this.cutModeEnabled) {
      return;
    }
    if (this.drawModeEnabled) {
      this.disableDrawMode();
    }
    this.cutModeEnabled = true;
    this.updateTopLeftControls();

    this.maskMap.pm.enableGlobalCutMode({
      // @ts-ignore
      allowSelfIntersection: false,
      tooltips: false
    });
  }

  private disableCutMode(): void {
    if (!this.cutModeEnabled) {
      return;
    }
    this.cutModeEnabled = false;
    this.updateTopLeftControls();
    this.maskMap.pm.disableGlobalCutMode();
  }

  private handleMaskChange(maskId: string | null): void {
    this.selectedMaskId = maskId;
    this.updateGeoJson();
    this.updateTopLeftControls();
  }

  private updateGeoJson(): void {
    this.features = new Map();
    this.featureLayers = new Map();
    this.geoJsonLayer.clearLayers();

    if (this.selectedMaskId !== null) {
      this.apiService.fetchGeoJson(this.bioImageInfo.id, this.selectedMaskId).subscribe(
        features => this.geoJsonLayer.addData(features as any),
        error => window.alert('Failed to retrieve polygons from server!')
      )
    }
  }

  private onEachFeature(feature: Feature<Polygon, any>, layer: L.Layer): void {
    if (!feature.properties) {
      feature.properties = {};
    }

    let fid = 0;
    if (feature.properties.FID == null) {
      fid = this.maxFid + 1;
      feature.properties = {
        FID: fid
      };
    } else {
      fid = feature.properties.FID;
    }
    if (fid > this.maxFid) {
      this.maxFid = fid;
    }

    if (feature.properties.simplifyTolerance == null) {
      feature.properties.simplifyTolerance = 0;
    }

    this.features.set(fid, feature);
    this.featureLayers.set(fid, layer);

    layer.bindPopup(this.createFeaturePopup(fid));

    layer.on('pm:update', result =>
      this.editFeature(fid, result.layer)
    )
  }

  private updateFeatureLayer(fid: number, openPopup: boolean = false): void {
    this.featureLayers.get(fid)?.remove();
    this.geoJsonLayer.addData(this.features.get(fid)!);

    if (openPopup) {
      this.featureLayers.get(fid)!.openPopup();
    }
  }

  private createFeature(layer: L.Layer): void {
    layer.remove();

    const feature = this.leafletService.layerToFeature(layer);
    this.geoJsonLayer.addData(feature);

    const prevFeature = JSON.parse(JSON.stringify(feature));
    prevFeature.geometry = null;
    this.addToFeatureEditUndoStack([prevFeature]);
  }

  private editFeature(fid: number, layer: L.Layer): void {
    const feature = this.features.get(fid)!;
    this.addToFeatureEditUndoStack([feature]);
    feature.geometry.coordinates = this.leafletService.layerToPoints(layer);
  }

  private cutFeature(feature: Feature<Polygon | MultiPolygon, any>, prevFeature: Feature<Polygon, any>): void {
    if (!feature) { // Feature is cutted out completely.
      this.addToFeatureEditUndoStack([prevFeature]);
      this.removeFeature(prevFeature.properties.FID);
      return;
    }

    const undoFeatures = [prevFeature];

    let features: Feature<Polygon, any>[] = [];
    if (feature.geometry.type === 'Polygon') {
      const copy = JSON.parse(JSON.stringify(feature));
      copy.properties = {};
      features = [copy];
    } else {
      features = this.leafletService.splitMultiPolygonFeature(feature as Feature<MultiPolygon, any>);
    }

    for (const feature of features) {
      feature.geometry.coordinates = feature.geometry.coordinates.map(
        ring => ring.map(
          latLng => this.leafletService.toPoint(L.latLng(latLng[1], latLng[0]))
        )
      )
      this.geoJsonLayer.addData(feature);

      const prevFeature = JSON.parse(JSON.stringify(feature));
      prevFeature.geometry = null;
      undoFeatures.push(prevFeature);
    }

    this.addToFeatureEditUndoStack(undoFeatures);

    this.removeFeature(feature.properties.FID);
    this.removeFeature(prevFeature.properties.FID);
  }

  private simplifyFeature(fid: number, openPopup: boolean = false): boolean {
    const feature = this.features.get(fid)!;
    let simplifiedFeature = feature;
    let isSimplified = false;
    while (this.leafletService.hasNonTriangularRing(simplifiedFeature) &&
      feature.properties.simplifyTolerance <= this.maxSimplifyTolerance &&
      this.leafletService.haveEqualPolygons(feature, simplifiedFeature))
    {
      simplifiedFeature = this.leafletService.simplifyFeature(feature, ++feature.properties.simplifyTolerance);
      isSimplified = true;
    }

    this.features.set(fid, simplifiedFeature);
    this.updateFeatureLayer(fid, openPopup);

    return isSimplified;
  }

  private simplifyAllFeatures(): void {
    const simplifiedFeatures: Feature<Polygon, any>[] = [];

    for (const feature of this.features.values()) {
      const copy = JSON.parse(JSON.stringify(feature));
      const isSimplified = this.simplifyFeature(feature.properties.FID);
      if (isSimplified) {
        simplifiedFeatures.push(copy);
      }
    }

    this.addToFeatureEditUndoStack(simplifiedFeatures);
  }

  private removeInnerRings(fid: number, openPopup: boolean = false) {
    const feature = this.features.get(fid)!
    feature.geometry.coordinates = this.leafletService.removeInnerRings(feature.geometry.coordinates as L.PointTuple[][]);
    this.updateFeatureLayer(fid, openPopup);
  }

  private removeAllInnerRings(): void {
    const featuresWithInnerRing: Feature<Polygon, any>[] = [];

    for (const feature of this.features.values()) {
      if (feature.geometry.coordinates.length > 1) {
        featuresWithInnerRing.push(JSON.parse(JSON.stringify(feature)));
        this.removeInnerRings(feature.properties.FID);
      }
    }

    this.addToFeatureEditUndoStack(featuresWithInnerRing);
  }

  private removeFeature(fid: number) {
    this.featureLayers.get(fid)?.remove();
    this.features.delete(fid);
    this.featureLayers.delete(fid);
  }

  private addToFeatureEditUndoStack(features: Feature<Polygon, any>[]): void {
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
    for (const feature of prevFeatures) {
      if (feature.geometry === null) {
        // Feature was created before undo, so remove it.
        this.removeFeature(feature.properties.FID);
        continue;
      }

      const fid = feature.properties.FID;
      this.features.set(fid, feature);
      this.updateFeatureLayer(fid);

      const layer: any = this.featureLayers.get(fid);
      if (prevFeatures.length === 1) {
        const bounds: L.LatLngBounds = layer.getBounds();
        this.maskMap.panTo(bounds.getCenter());
      }
      layer.setStyle({
        color: 'yellow'
      });
      setTimeout(() => {
        this.geoJsonLayer.resetStyle(layer);
      }, 1500);
    }
    
    if (this.featureEditUndoStack.length === 0) {
      this.featureEditUndoControl.remove();
    }
  }
}
