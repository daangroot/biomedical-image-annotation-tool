import { Input, Component, OnInit, AfterViewInit, ViewChild, HostListener } from '@angular/core';
import * as L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import { Feature, Polygon, MultiPolygon } from 'geojson';
import { environment } from '../../../environments/environment';
import { FeatureGrade } from '../../types/feature-grade.type';
import { LeafletService } from './leaflet.service';
import { MaskExportComponent } from '../../mask-export/mask-export.component';
import { ImageMetadata } from '../../types/image-metadata.type';
import { MaskApiService } from '../../services/mask-api.service';
import { AnnotationData } from '../../types/annotation-data.type';

@Component({
  selector: 'app-leaflet',
  templateUrl: './leaflet.component.html',
  styleUrls: ['./leaflet.component.css']
})
export class LeafletComponent implements OnInit, AfterViewInit {
  @Input() imageId!: string;
  @Input() maskId!: string;
  @Input() imageMetadata!: ImageMetadata;
  @Input() maskMetadata!: ImageMetadata;
  @ViewChild(MaskExportComponent) private maskExportComponent!: MaskExportComponent;
  headerHeight!: number;
  showBaseMap: boolean = false;
  private baseMap!: L.Map;
  private maskMap!: L.Map;
  private sw!: L.PointTuple;
  private ne!: L.PointTuple;
  private swMax!: L.PointTuple;
  private neMax!: L.PointTuple;
  private maxNativeZoom!: number;
  private featuresLayer!: L.GeoJSON;

  private showTopLeftControlsControl!: L.Control;
  private hideTopLeftControlsControl!: L.Control;
  private splitScreenControl!: L.Control;
  private drawFeatureControl!: L.Control;
  private cancelDrawFeatureControl!: L.Control;
  private cutFeatureControl!: L.Control;
  private cancelCutFeatureControl!: L.Control
  private simplifyAllPolygonsControl!: L.Control;
  private removeAllInnerRingsControl!: L.Control;
  private featureEditUndoControl!: L.Control;
  private setOverallScoreControl!: L.Control;
  private saveFeaturesControl!: L.Control;
  private resetFeaturesControl!: L.Control;
  private exportControl!: L.Control;
  private unsavedChangesControl!: L.Control;

  private showTopLeftControls: boolean = true;
  private drawModeEnabled: boolean = false;
  private cutModeEnabled: boolean = false;
  private maxFid: number = -1;
  private features: Map<number, Feature<Polygon, any>> = new Map();
  private featureLayers: Map<number, L.Layer> = new Map();
  private featureEditUndoStack: Feature<Polygon, any>[][] = [];
  private unsavedChanges: boolean = false;

  private overallScore: number | null = null;

  private readonly tileSize: number = 128;
  private readonly maxSimplifyTolerance: number = 10000;

  constructor(
    private maskApiService: MaskApiService,
    private leafletService: LeafletService
  ) { }

  ngOnInit(): void {
    this.headerHeight = document.getElementById('navbar')!.clientHeight;
  }

  ngAfterViewInit(): void {
    this.initMaskMap();
    this.updateAnnotationData();
  }

  private updateAnnotationData(): void {
    this.maxFid = -1;
    this.features = new Map();
    this.featureLayers = new Map();
    this.featuresLayer.clearLayers();

    this.maskApiService.fetchAnnotationData(this.imageId, this.maskId).subscribe(
      annotationData => {
        this.featuresLayer.addData(annotationData.features as any);
        this.overallScore = annotationData.overallScore;
      },
      error => window.alert('Failed to retrieve annotation data from server!')
    )
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
    this.sw = [0, this.imageMetadata.height];
    this.ne = [this.imageMetadata.width, 0];
    const offset: number = this.tileSize * 20;
    this.swMax = [this.sw[0] - offset, this.sw[1] + offset];
    this.neMax = [this.ne[0] + offset, this.ne[1] - offset];

    this.maxNativeZoom = this.leafletService.calcMaxNativeZoomLevel(this.imageMetadata.width, this.imageMetadata.height, this.tileSize);
    this.leafletService.setMaxNativeZoom(this.maxNativeZoom);

    this.maskMap = this.leafletService.createMap('leaflet-viewer-mask');
    this.leafletService.setMap(this.maskMap);
    this.maskMap.setView([0, 0], 0);
    this.maskMap.setMaxBounds(L.latLngBounds(this.leafletService.toLatLng(this.swMax), this.leafletService.toLatLng(this.neMax)));

    this.addTileLayer(this.maskMap);

    this.featuresLayer = L.geoJSON(undefined, {
      coordsToLatLng: (coords: L.PointTuple) => this.leafletService.toLatLng(coords),
      onEachFeature: (feature: Feature<Polygon, any>, layer) => this.onEachFeature(feature, layer),
      style: (feature: any) => this.determineFeatureStyle(feature),
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

    this.initControls();
  }

  private fitContainer(): void {
    if (this.showBaseMap) {
      this.baseMap.invalidateSize();
    }
    this.maskMap.invalidateSize();
  }

  private addTileLayer(map: L.Map) {
    L.tileLayer(`${environment.apiUrl}/api/images/${this.imageId}/tiles/{z}/{y}/{x}`, {
      bounds: L.latLngBounds(this.leafletService.toLatLng(this.sw), this.leafletService.toLatLng(this.ne)),
      tileSize: this.tileSize,
      maxNativeZoom: this.maxNativeZoom
    }).addTo(map);
  }

  private initControls(): void {
    L.control.zoom({
      position: 'bottomright'
    }).addTo(this.maskMap);

    
    this.showTopLeftControlsControl = this.leafletService.createShowControlsControl(() => this.toggleTopLeftControls());
    this.hideTopLeftControlsControl = this.leafletService.createHideControlsControl(() => this.toggleTopLeftControls());
    this.splitScreenControl = this.leafletService.createSplitScreenControl(() => this.toggleBaseMap());
    this.drawFeatureControl = this.leafletService.createDrawFeatureControl(() => this.enableDrawMode());
    this.cancelDrawFeatureControl = this.leafletService.createCancelDrawFeatureControl(() => this.disableDrawMode());
    this.cutFeatureControl = this.leafletService.createCutFeatureControl(() => this.enableCutMode());
    this.cancelCutFeatureControl = this.leafletService.createCancelCutFeatureControl(() => this.disableCutMode());
    this.simplifyAllPolygonsControl = this.leafletService.createSimplifyAllFeaturesControl(() => this.simplifyAllFeatures());
    this.removeAllInnerRingsControl = this.leafletService.createRemoveAllInnerRingsControl(() => this.removeAllInnerRings());
    this.featureEditUndoControl = this.leafletService.createFeatureEditUndoControl(() => this.undoFeatureEdit());
    this.setOverallScoreControl = this.leafletService.createSetOverallScoreControl(() => this.setOverallScore());
    this.saveFeaturesControl = this.leafletService.createSaveFeaturesControl(() => this.saveChanges());
    this.exportControl = this.leafletService.createExportControl(() => this.exportMask());
    this.resetFeaturesControl = this.leafletService.createResetFeaturesControl(() => this.resetAnnotationData());
    this.unsavedChangesControl = this.leafletService.createUnsavedChangesControl().addTo(this.maskMap);

    this.updateTopLeftControls();
  }

  private updateTopLeftControls(): void {
    this.showTopLeftControlsControl.remove();
    this.hideTopLeftControlsControl.remove();
    this.splitScreenControl.remove();
    this.drawFeatureControl.remove();
    this.cancelDrawFeatureControl.remove();
    this.cutFeatureControl.remove();
    this.cancelCutFeatureControl.remove();
    this.simplifyAllPolygonsControl.remove();
    this.removeAllInnerRingsControl.remove();
    this.setOverallScoreControl.remove();
    this.saveFeaturesControl.remove();
    this.exportControl.remove();
    this.resetFeaturesControl.remove();

    if (!this.showTopLeftControls) {
      this.showTopLeftControlsControl.addTo(this.maskMap);
      return;
    }

    this.hideTopLeftControlsControl.addTo(this.maskMap);
    this.splitScreenControl.addTo(this.maskMap);

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
    this.setOverallScoreControl.addTo(this.maskMap);
    this.saveFeaturesControl.addTo(this.maskMap);
    this.resetFeaturesControl.addTo(this.maskMap);
    this.exportControl.addTo(this.maskMap);
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
    if (!this.drawModeEnabled) {
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

    const deleteContainer = L.DomUtil.create('div', 'mb-2', container);
    const deleteButton = L.DomUtil.create('button', 'btn btn-danger me-2', deleteContainer);
    deleteButton.innerHTML = 'Remove';
    deleteButton.onclick = () => {
      this.addToFeatureEditUndoStack([feature]);
      this.removeFeature(fid);
    };

    const innerRingCount = feature.geometry.coordinates.length - 1;
    if (innerRingCount > 0) {
      const deleteInnerButton = L.DomUtil.create('button', 'btn btn-danger', deleteContainer);
      deleteInnerButton.innerHTML = innerRingCount === 1 ? 'Remove hole' : 'Remove holes';
      deleteInnerButton.onclick = () => {
        this.addToFeatureEditUndoStack([feature]);
        this.removeInnerRings(fid, true);
      };
    }

    return container;
  }

  private createFeatureGradePopupHtml(fid: number): HTMLElement {
    const feature = this.features.get(fid)!;
    const gradingContainer = L.DomUtil.create('div', 'mb-3');

    // Segment score

    const scoreLabel = L.DomUtil.create('label', 'form-label', gradingContainer) as HTMLLabelElement;
    scoreLabel.htmlFor = `segment-score-${fid}`;
    scoreLabel.innerHTML = 'Segment accuracy';

    const scoreContainer = L.DomUtil.create('div', 'input-group mb-2', gradingContainer);

    const scoreInput = L.DomUtil.create('input', 'form-control', scoreContainer) as HTMLInputElement;
    scoreInput.type = 'number';
    scoreInput.min = '0';
    scoreInput.max = '100';
    scoreInput.placeholder = 'Score';
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

    const gradeLabel = L.DomUtil.create('label', 'form-label', gradingContainer) as HTMLLabelElement;
    gradeLabel.htmlFor = `segment-grade-${fid}`;
    gradeLabel.innerHTML = 'Segment grade';

    const gradeSelect = L.DomUtil.create('select', 'form-select', gradingContainer) as HTMLSelectElement;
    gradeSelect.id = `segment-grade-${fid}`;

    L.DomUtil.create('option', undefined, gradeSelect);

    const truePositive = L.DomUtil.create('option', undefined, gradeSelect) as HTMLOptionElement;
    truePositive.innerHTML = 'True positive';
    truePositive.selected = feature.properties.grade === FeatureGrade.TruePositive;

    const falsePositive = L.DomUtil.create('option', undefined, gradeSelect) as HTMLOptionElement;
    falsePositive.innerHTML = 'False positive';
    falsePositive.selected = feature.properties.grade === FeatureGrade.FalsePositive;

    const falseNegative = L.DomUtil.create('option', undefined, gradeSelect) as HTMLOptionElement;
    falseNegative.innerHTML = 'False negative';
    falseNegative.selected = feature.properties.grade === FeatureGrade.FalseNegative;

    gradeSelect.oninput = () => {
      let grade;
      if (truePositive.selected) {
        grade = FeatureGrade.TruePositive;
      } else if (falsePositive.selected) {
        grade = FeatureGrade.FalsePositive;
      } else if (falseNegative.selected) {
        grade = FeatureGrade.FalseNegative;
      }
      if (grade != null) {
        this.setFeatureGrade(fid, grade);
      }
    }

    return gradingContainer;
  }

  private determineFeatureStyle(feature: Feature<Polygon, any>): L.PathOptions {
    if (!feature.properties) {
      return {};
    }

    switch (feature.properties.grade) {
      case FeatureGrade.TruePositive:  return { color: 'green' };
      case FeatureGrade.FalsePositive: return { color: 'red' };
      case FeatureGrade.FalseNegative: return { color: 'orange' };
      default: return {};
    }
  }

  private onEachFeature(feature: Feature<Polygon, any>, layer: L.Layer): void {
    if (!feature.properties) {
      feature.properties = {};
    }

    let fid = 0;
    if (feature.properties.fid == null) {
      fid = this.maxFid + 1;
      feature.properties.fid = fid;
    } else {
      fid = feature.properties.fid;
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
    this.featuresLayer.removeLayer(this.featureLayers.get(fid)!);
    this.featuresLayer.addData(this.features.get(fid)!);

    if (openPopup) {
      this.featureLayers.get(fid)!.openPopup();
    }
  }

  private setFeatureScore(fid: number, scoreString: string): void {
    try {
      const score = parseInt(scoreString);
      const feature = this.features.get(fid)!;
      feature.properties.score = score;
      this.setUnsavedChanges(true);
    }
    catch { }
  }

  private setFeatureGrade(fid: number, grade: FeatureGrade): void {
    const feature = this.features.get(fid)!;
    feature.properties.grade = grade;
    this.updateFeatureLayer(fid, true);
    this.setUnsavedChanges(true);
  }

  private createFeature(layer: L.Layer): void {
    layer.remove();

    const feature = this.leafletService.layerToFeature(layer);
    this.featuresLayer.addData(feature);

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
      this.removeFeature(prevFeature.properties.fid);
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
      this.featuresLayer.addData(feature);

      const prevFeature = JSON.parse(JSON.stringify(feature));
      prevFeature.geometry = null;
      undoFeatures.push(prevFeature);
    }

    this.addToFeatureEditUndoStack(undoFeatures);

    this.removeFeature(feature.properties.fid);
    this.removeFeature(prevFeature.properties.fid);
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
      const isSimplified = this.simplifyFeature(feature.properties.fid);
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
        this.removeInnerRings(feature.properties.fid);
      }
    }

    this.addToFeatureEditUndoStack(featuresWithInnerRing);
  }

  private removeFeature(fid: number) {
    this.featureLayers.get(fid)?.remove();
    this.features.delete(fid);
    this.featureLayers.delete(fid);
  }

  private saveChanges(): void {
    const annotationData: AnnotationData = {
      features: Array.from(this.features.values()),
      overallScore: this.overallScore
    }

    this.maskApiService.saveAnnotationData(this.imageId, this.maskId, annotationData).subscribe(
      next => {
        this.setUnsavedChanges(false);
        window.alert('Segments and grades have been saved successfully.');
      },
      error => window.alert('Failed to save segments and grades!')
    );
  }

  private setUnsavedChanges(unsavedChanges: boolean) {
    this.unsavedChanges = unsavedChanges;
    // @ts-ignore
    this.unsavedChangesControl.setVisible(unsavedChanges);
  }

  private resetAnnotationData(): void {
    if (!window.confirm("Are you sure you want to reset all segments and grades? This will undo all saved changes and reset the mask to the original state.")) {
      return;
    }

    this.maskApiService.resetAnnotationData(this.imageId, this.maskId).subscribe(
      next => {
        this.updateAnnotationData();
        this.setUnsavedChanges(false);
      },
      error => window.alert('Failed to reset segments and grades!')
    )
  }

  private exportMask(): void {
    if (this.unsavedChanges) {
      window.alert('Changes must be saved before the mask can be exported.');
      return;
    }

    this.maskExportComponent.show(this.imageId, this.maskMetadata);
  }

  private addToFeatureEditUndoStack(features: Feature<Polygon, any>[]): void {
    if (features.length === 0) {
      return;
    }

    const copy = JSON.parse(JSON.stringify(features));
    this.featureEditUndoStack.push(copy);

    this.featureEditUndoControl.addTo(this.maskMap);
    this.setUnsavedChanges(true);
  }

  private undoFeatureEdit(): void {
    if (this.featureEditUndoStack.length === 0) {
      return;
    }

    const prevFeatures = this.featureEditUndoStack.pop()!;
    for (const feature of prevFeatures) {
      if (feature.geometry === null) {
        // Feature was created before undo, so remove it.
        this.removeFeature(feature.properties.fid);
        continue;
      }

      const fid = feature.properties.fid;
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
        this.featuresLayer.resetStyle(layer);
      }, 1500);
    }
    
    if (this.featureEditUndoStack.length === 0) {
      this.featureEditUndoControl.remove();
    }

    this.setUnsavedChanges(true);
  }

  private setOverallScore() {
    const defaultText = this.overallScore !== null ? this.overallScore.toString() : '';
    const value = window.prompt('How accurate is the segmentation overall? (0-100%)', defaultText);

    if (!value) {
      return;
    }

    try {
      const score = parseInt(value);

      if (!isNaN(score) && score >= 0 && score <= 100) {
        this.overallScore = score;
        this.setUnsavedChanges(true);
      }
    } catch { }
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload($event: BeforeUnloadEvent) {
    if (this.unsavedChanges) {
      $event.preventDefault();
      $event.returnValue = '';
    }
  }
}
