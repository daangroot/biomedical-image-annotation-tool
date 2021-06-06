import { Input, Component, OnInit, AfterViewInit, ViewChild, HostListener } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet.sync';
import '@geoman-io/leaflet-geoman-free';
import FreeDraw from 'leaflet-freedraw';
import { Feature, Polygon, MultiPolygon } from 'geojson';
import { environment } from '../../../environments/environment';
import { FeatureGrade } from '../../types/feature-grade.type';
import { LeafletService } from './leaflet.service';
import { MaskExportComponent } from '../../mask-export/mask-export.component';
import { ImageMetadata } from '../../types/image-metadata.type';
import { MaskApiService } from '../../services/mask-api.service';
import { AnnotationData } from '../../types/annotation-data.type';
import { StatisticsComponent } from '../statistics/statistics.component';

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
  @ViewChild(StatisticsComponent) private statisticsComponent!: StatisticsComponent;
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
  private freeDrawLayer!: FreeDraw;

  private toggleTopLeftControlsButton!: HTMLElement;
  private drawFeatureButton!: HTMLElement;
  private freeDrawFeatureButton!: HTMLElement;
  private removeLastVertexButton!: HTMLElement;
  private cutFeatureButton!: HTMLElement;
  private multiSelectButton!: HTMLElement;
  private mergeSelectedFeaturesButton!: HTMLElement;
  private convexSelectedFeaturesButton!: HTMLElement;
  private simplifySelectedFeaturesButton!: HTMLElement;
  private removeHolesInSelectedFeaturesButton!: HTMLElement;
  private removeSelectedFeaturesButton!: HTMLElement;
  private editFeatureControl!: L.Control;
  private splitScreenControl!: L.Control;
  private showStatisticsControl!: L.Control;
  private saveExportControl!: L.Control;
  private unsavedChangesControl!: L.Control;
  private featureEditUndoControl!: L.Control;

  private showTopLeftControls: boolean = true;
  private drawModeEnabled: boolean = false;
  private freeDrawModeEnabled: boolean = false;
  private cutModeEnabled: boolean = false;
  private multiSelectModeEnabled: boolean = false;
  private drawnVertexCount: number = 0;
  private maxFid: number = -1;
  private features: Map<number, Feature<Polygon, any>> = new Map();
  private featureLayers: Map<number, L.Layer> = new Map();
  private featureEditUndoStack: Feature<Polygon, any>[][] = [];
  private selectedFids: Set<number> = new Set();
  private unsavedChanges: boolean = false;

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
    this.setUnsavedChanges(false);
    this.featureEditUndoStack = [];
    this.featureEditUndoControl.remove();

    this.maskApiService.fetchAnnotationData(this.imageId, this.maskId).subscribe(
      annotationData => this.featuresLayer.addData(annotationData.features as any),
      error => window.alert('Failed to retrieve annotation data from server!')
    )
  }

  private initBaseMap(): void {
    this.baseMap = this.leafletService.createMap('leaflet-viewer-base');
    this.baseMap.setMaxBounds(L.latLngBounds(this.leafletService.toLatLng(this.swMax), this.leafletService.toLatLng(this.neMax)));
    this.addTileLayer(this.baseMap);

    L.control.zoom({
      position: 'bottomright'
    }).addTo(this.baseMap);

    // @ts-ignore
    this.maskMap.sync(this.baseMap);
    // @ts-ignore
    this.baseMap.sync(this.maskMap);
  }

  private destroyBaseMap(): void {
    // @ts-ignore
    this.maskMap.unsync(this.baseMap);
    // @ts-ignore
    this.baseMap.unsync(this.maskMap);
    this.baseMap.remove();
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

    this.freeDrawLayer = new FreeDraw({
      mode: FreeDraw.NONE,
      strokeWidth: 3
    }).addTo(this.maskMap);

    this.maskMap.on('pm:drawstart', ({ workingLayer }: any) =>
      workingLayer.on('pm:vertexadded', (e: any) =>
        this.onVertexDrawn()
      )
    );

    this.maskMap.on('pm:create', result => {
      this.createFeature(result.layer);
      this.drawnVertexCount = 0;
      this.removeLastVertexButton.hidden = true;
    });

    this.maskMap.on('pm:globalcutmodetoggled', (result: any) => {
      if (this.cutModeEnabled && !result.enabled) {
        this.toggleCutMode(false);
      }
    })

    this.maskMap.on('pm:cut', (result: any) => {
      this.cutFeature(result.layer.feature, result.originalLayer.feature);
      this.toggleCutMode(false);
    });

    this.freeDrawLayer.on('markers', (event: any) => {
      if (event.eventType === 'create') {
        this.createFreehandFeature(event.latLngs);
      }
    });

    this.initMaskMapControls();
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

  private initMaskMapControls(): void {
    L.control.zoom({
      position: 'bottomright'
    }).addTo(this.maskMap);

    this.toggleTopLeftControlsButton = this.leafletService.createButtonElement('Hide buttons', 'expand_less', () => this.toggleTopLeftControls());
    this.leafletService.createButtonControl(this.toggleTopLeftControlsButton, 'topleft').addTo(this.maskMap);

    const splitScreenButton = this.leafletService.createButtonElement('Split screen', 'swap_horiz', () => this.toggleBaseMap());
    this.splitScreenControl = this.leafletService.createButtonControl(splitScreenButton, 'topleft').addTo(this.maskMap);

    this.drawFeatureButton = this.leafletService.createButtonElement('Draw segment', 'polygon', () => this.toggleDrawMode());
    this.removeLastVertexButton = this.leafletService.createButtonElement('Remove last vertex', 'undo', () => this.removeLastVertex());
    this.removeLastVertexButton.style.backgroundColor = '#3388ff';
    this.removeLastVertexButton.hidden = true;
    this.freeDrawFeatureButton = this.leafletService.createButtonElement('Draw segment freehand', 'free_draw', () => this.toggleFreeDrawMode());
    this.cutFeatureButton = this.leafletService.createButtonElement('Cut segment', 'cut', () => this.toggleCutMode());

    const simplifyAllFeaturesButton = this.leafletService.createButtonElement('Simplify all segments', 'simplify', () =>
      this.simplifyFeatures(Array.from(this.features.values()))
    );
    const removeAllHolesButton = this.leafletService.createButtonElement('Remove all holes', 'delete_inner_rings', () =>
      this.removeHolesInFeatures(Array.from(this.features.values()))
    );

    this.multiSelectButton = this.leafletService.createButtonElement('Select segments', 'hand_cursor', () => this.toggleMultiSelectMode());

    this.mergeSelectedFeaturesButton = this.leafletService.createButtonElement('Merge selected segments', 'merge', () =>
      this.mergeFeatures(this.getSelectedFeatures())
    );
    this.mergeSelectedFeaturesButton.style.backgroundColor = '#3388ff';
    this.mergeSelectedFeaturesButton.hidden = true;

    this.convexSelectedFeaturesButton = this.leafletService.createButtonElement('Create convex hull of selected segments', 'convex_hull', () =>
      this.createConvexHull(this.getSelectedFeatures())
    );
    this.convexSelectedFeaturesButton.style.backgroundColor = '#3388ff';
    this.convexSelectedFeaturesButton.hidden = true;

    this.simplifySelectedFeaturesButton = this.leafletService.createButtonElement('Simplify selected segments', 'simplify', () => 
      this.simplifyFeatures(this.getSelectedFeatures())
    );
    this.simplifySelectedFeaturesButton.style.backgroundColor = '#3388ff';
    this.simplifySelectedFeaturesButton.hidden = true;

    this.removeHolesInSelectedFeaturesButton = this.leafletService.createButtonElement('Remove holes in selected segments', 'delete_inner_rings', () => 
      this.removeHolesInFeatures(this.getSelectedFeatures())
    );
    this.removeHolesInSelectedFeaturesButton.style.backgroundColor = '#3388ff';
    this.removeHolesInSelectedFeaturesButton.hidden = true;

    this.removeSelectedFeaturesButton = this.leafletService.createButtonElement('Remove selected segments', 'delete', () => 
      this.removeFeatures(this.getSelectedFeatures(), true)
    );
    this.removeSelectedFeaturesButton.style.backgroundColor = '#3388ff';
    this.removeSelectedFeaturesButton.hidden = true;

    const editButtons = [
      this.drawFeatureButton,
      this.removeLastVertexButton,
      this.freeDrawFeatureButton,
      this.cutFeatureButton,
      simplifyAllFeaturesButton,
      removeAllHolesButton,
      this.multiSelectButton,
      this.mergeSelectedFeaturesButton,
      this.convexSelectedFeaturesButton,
      this.simplifySelectedFeaturesButton,
      this.removeHolesInSelectedFeaturesButton,
      this.removeSelectedFeaturesButton
    ];
    this.editFeatureControl = this.leafletService.createButtonsControl(editButtons, 'topleft').addTo(this.maskMap);

    const showStatisticsButton = this.leafletService.createButtonElement('Show statistics', 'statistics', () => this.showStatistics());
    this.showStatisticsControl = this.leafletService.createButtonControl(showStatisticsButton, 'topleft').addTo(this.maskMap);

    const saveButton = this.leafletService.createButtonElement('Save segments and grades', 'save', () => this.saveChanges());
    const resetFeaturesButton = this.leafletService.createButtonElement('Reset segments and grades', 'restore', () => this.resetAnnotationData());
    const exportButton = this.leafletService.createButtonElement('Export segmentation mask', 'export', () => this.exportMask());
    const saveExportButtons = [saveButton, resetFeaturesButton, exportButton];
    this.saveExportControl = this.leafletService.createButtonsControl(saveExportButtons, 'topleft').addTo(this.maskMap);

    this.unsavedChangesControl = this.leafletService.createUnsavedChangesControl().addTo(this.maskMap);

    const undoButton = this.leafletService.createButtonElement('Undo last operation', 'undo', () => this.undoFeatureEdit());
    this.featureEditUndoControl = this.leafletService.createButtonControl(undoButton, 'topright');
  }

  private toggleTopLeftControls() {
    this.showTopLeftControls = !this.showTopLeftControls;

    this.toggleTopLeftControlsButton.title = this.showTopLeftControls ? 'Hide buttons' : 'Show buttons';
    this.toggleTopLeftControlsButton.style.backgroundImage = this.showTopLeftControls ? 'url("/assets/expand_less.png")' : 'url("/assets/expand_more.png")';

    if (this.showTopLeftControls) {
      this.splitScreenControl.addTo(this.maskMap);
      this.editFeatureControl.addTo(this.maskMap);
      this.showStatisticsControl.addTo(this.maskMap);
      this.saveExportControl.addTo(this.maskMap);
    } else {
      this.splitScreenControl.remove();
      this.editFeatureControl.remove();
      this.showStatisticsControl.remove();
      this.saveExportControl.remove();
    }
  }

  private toggleDrawMode(force?: boolean): void {
    this.drawModeEnabled = force !== undefined ? force : !this.drawModeEnabled;
    if (this.drawModeEnabled) {
      if (this.freeDrawModeEnabled) {
        this.toggleFreeDrawMode(false);
      }
      if (this.cutModeEnabled) {
        this.toggleCutMode(false);
      }
    }

    this.drawFeatureButton.title = this.drawModeEnabled ? 'Cancel segment drawing' : 'Draw segment';
    this.drawFeatureButton.classList.toggle('active', this.drawModeEnabled);

    if (this.drawModeEnabled) {
      this.maskMap.pm.enableDraw('Polygon', {
        // @ts-ignore
        allowSelfIntersection: false,
        continueDrawing: true,
        tooltips: false
      });
    } else {
      // @ts-ignore
      this.maskMap.pm.disableDraw();
      this.drawnVertexCount = 0;
      this.removeLastVertexButton.hidden = true;
      // Reset on click listener, because for some reason Geoman changes it.
      this.features.forEach((_feature, fid) =>
        this.setOnFeatureClickListener(fid)
      );
    }
  }

  private toggleFreeDrawMode(force?: boolean) {
    this.freeDrawModeEnabled = force !== undefined ? force : !this.freeDrawModeEnabled;
    if (this.freeDrawModeEnabled) {
      if (this.drawModeEnabled) {
        this.toggleDrawMode(false);
      }
      if (this.cutModeEnabled) {
        this.toggleCutMode(false);
      }
    }

    this.freeDrawFeatureButton.title = this.freeDrawModeEnabled ? 'Cancel segment drawing freehand' : 'Draw segment freehand';
    this.freeDrawFeatureButton.classList.toggle('active', this.freeDrawModeEnabled);

    if (this.freeDrawModeEnabled) {
      this.freeDrawLayer.mode(FreeDraw.CREATE);
    } else {
      this.freeDrawLayer.mode(FreeDraw.NONE);
    }
  }

  private toggleCutMode(force?: boolean): void {
    this.cutModeEnabled = force !== undefined ? force : !this.cutModeEnabled;
    if (this.cutModeEnabled) {
      if (this.drawModeEnabled) {
        this.toggleDrawMode(false);
      }
      if (this.freeDrawModeEnabled) {
        this.toggleFreeDrawMode(false);
      }
    }

    this.cutFeatureButton.title = this.cutModeEnabled ? 'Cancel segment cutting' : 'Cut segment';
    this.cutFeatureButton.classList.toggle('active', this.cutModeEnabled);

    if (this.cutModeEnabled) {
      this.maskMap.pm.enableGlobalCutMode({
        // @ts-ignore
        allowSelfIntersection: false,
        tooltips: false
      });
    } else {
      this.maskMap.pm.disableGlobalCutMode();
      // Reset on click listener, because for some reason Geoman changes it.
      this.features.forEach((_feature, fid) =>
        this.setOnFeatureClickListener(fid)
      );
    }
  }

  private toggleMultiSelectMode(force?: boolean): void {
    this.multiSelectModeEnabled = force !== undefined ? force : !this.multiSelectModeEnabled;

    this.multiSelectButton.title = this.multiSelectModeEnabled ? 'Cancel selecting segments' : 'Select segments';
    this.multiSelectButton.classList.toggle('active', this.multiSelectModeEnabled);
    this.mergeSelectedFeaturesButton.hidden = !this.multiSelectModeEnabled;
    this.convexSelectedFeaturesButton.hidden = !this.multiSelectModeEnabled;
    this.simplifySelectedFeaturesButton.hidden = !this.multiSelectModeEnabled;
    this.removeHolesInSelectedFeaturesButton.hidden = !this.multiSelectModeEnabled;
    this.removeSelectedFeaturesButton.hidden = !this.multiSelectModeEnabled;

    if (!this.multiSelectModeEnabled) {
      this.selectedFids.forEach(fid => {
        this.selectedFids.delete(fid);
        const layer = this.featureLayers.get(fid)!;
        this.featuresLayer.resetStyle(layer);
      });
    }
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
      layer.getPopup()?.update();
      layer.pm.enable({
        allowSelfIntersection: false,
        limitMarkersToCount: 256,
        removeLayerBelowMinVertexCount: false
      })
    };

    const finishEditButton = L.DomUtil.create('button', 'btn btn-primary me-2', editSimplifyContainer);
    finishEditButton.innerHTML = 'Finish edit';
    finishEditButton.hidden = true
    finishEditButton.onclick = () => {
      editButton.hidden = false;
      finishEditButton.hidden = true;
      layer.getPopup()?.update();
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
      this.removeFeature(feature, true);
    };

    const innerRingCount = feature.geometry.coordinates.length - 1;
    if (innerRingCount > 0) {
      const deleteInnerButton = L.DomUtil.create('button', 'btn btn-danger', deleteContainer);
      deleteInnerButton.innerHTML = innerRingCount === 1 ? 'Remove hole' : 'Remove holes';
      deleteInnerButton.onclick = () => {
        this.addToFeatureEditUndoStack([feature]);
        this.removeHoles(fid, true);
      };
    }

    return container;
  }

  private createFeatureGradePopupHtml(fid: number): HTMLElement {
    const feature = this.features.get(fid)!;
    const gradingContainer = L.DomUtil.create('div', 'mb-3');

    const gradeButtons = L.DomUtil.create('div', 'btn-group-vertical', gradingContainer);

    const truePositive = L.DomUtil.create('input', 'btn-check', gradeButtons) as HTMLInputElement;
    truePositive.type = 'radio';
    truePositive.name = `segment-grade-${fid}`;
    truePositive.id = `segment-grade-${fid}-truepositive`;
    truePositive.checked = feature.properties.grade === FeatureGrade.TruePositive;

    const truePositiveLabel = L.DomUtil.create('label', 'btn btn-outline-success', gradeButtons) as HTMLLabelElement;
    truePositiveLabel.innerHTML = 'True Positive';
    truePositiveLabel.htmlFor = truePositive.id;

    const falsePositive = L.DomUtil.create('input', 'btn-check', gradeButtons) as HTMLInputElement;
    falsePositive.type = 'radio';
    falsePositive.name = `segment-grade-${fid}`;
    falsePositive.id = `segment-grade-${fid}-falsepositive`;
    falsePositive.checked = feature.properties.grade === FeatureGrade.FalsePositive;

    const falsePositiveLabel = L.DomUtil.create('label', 'btn btn-outline-danger', gradeButtons) as HTMLLabelElement;
    falsePositiveLabel.innerHTML = 'False Positive';
    falsePositiveLabel.htmlFor = falsePositive.id;

    const falseNegative = L.DomUtil.create('input', 'btn-check', gradeButtons) as HTMLInputElement;
    falseNegative.type = 'radio';
    falseNegative.name = `segment-grade-${fid}`;
    falseNegative.id = `segment-grade-${fid}-falsenegative`;
    falseNegative.checked = feature.properties.grade === FeatureGrade.FalseNegative;

    const falseNegativeLabel = L.DomUtil.create('label', 'btn btn-outline-warning', gradeButtons) as HTMLLabelElement;
    falseNegativeLabel.innerHTML = 'False Negative';
    falseNegativeLabel.htmlFor = falseNegative.id;

    const onChange = () => {
      let grade = null;
      if (truePositive.checked) {
        grade = FeatureGrade.TruePositive;
      } else if (falsePositive.checked) {
        grade = FeatureGrade.FalsePositive;
      } else if (falseNegative.checked) {
        grade = FeatureGrade.FalseNegative;
      }
      this.setFeatureGrade(fid, grade);
    };

    truePositive.onchange = onChange;
    falsePositive.onchange = onChange;
    falseNegative.onchange = onChange;

    return gradingContainer;
  }

  private determineFeatureStyle(feature: Feature<Polygon, any>): L.PathOptions {
    if (!feature.properties) {
      return {};
    }

    if (this.selectedFids.has(feature.properties.fid)) {
      return { color: '#3388ff' };
    }

    switch (feature.properties.grade) {
      case FeatureGrade.FalsePositive: return { color: 'red' };
      case FeatureGrade.FalseNegative: return { color: 'orange' };
      default: return { color: 'limegreen' };
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

    if (feature.properties.grade == null) {
      feature.properties.grade = FeatureGrade.TruePositive;
    }

    this.features.set(fid, feature);
    this.featureLayers.set(fid, layer);

    layer.bindPopup(this.createFeaturePopup(fid));

    layer.on('pm:update', result =>
      this.editFeature(fid, result.layer)
    );

    this.setOnFeatureClickListener(fid);
  }

  private setOnFeatureClickListener(fid: number): void {
    const layer = this.featureLayers.get(fid)!;
    layer.off('click');
    layer.on('click', (event: any) => {
      if (!this.multiSelectModeEnabled) {
        layer.openPopup(event.latlng);
        return;
      }

      if (this.selectedFids.has(fid)) {
        this.selectedFids.delete(fid);
      } else {
        this.selectedFids.add(fid);
      }
      this.featuresLayer.resetStyle(layer);
    });
  }

  private getSelectedFeatures(): Feature<Polygon, any>[] {
    const features = Array.from(this.features.values());
    return features.filter(feature => this.selectedFids.has(feature.properties.fid));
  }

  private updateFeatureLayer(fid: number, openPopup: boolean = false): void {
    this.featuresLayer.removeLayer(this.featureLayers.get(fid)!);
    this.featuresLayer.addData(this.features.get(fid)!);

    if (openPopup) {
      this.featureLayers.get(fid)!.openPopup();
    }
  }

  private setFeatureGrade(fid: number, grade: FeatureGrade | null): void {
    const feature = this.features.get(fid)!;
    feature.properties.grade = grade;
    this.featuresLayer.resetStyle(this.featureLayers.get(fid));
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

  private createFreehandFeature(latLngs: L.LatLng[][]): void {
    if (latLngs.length === 0) {
      return;
    }

    this.freeDrawLayer.clear();
    const points = this.leafletService.polygonToPoints(latLngs);
    const feature = this.leafletService.createFeature(points);
    this.featuresLayer.addData(feature);

    const prevFeature = JSON.parse(JSON.stringify(feature));
    prevFeature.geometry = null;
    this.addToFeatureEditUndoStack([prevFeature]);
  }

  private onVertexDrawn(): void {
    if (!this.drawModeEnabled) {
      return;
    }

    this.drawnVertexCount++;
    if (this.drawnVertexCount > 0) {
      this.removeLastVertexButton.hidden = false;
    }
  }

  private removeLastVertex(): void {
    // @ts-ignore
    this.maskMap.pm.Draw.Polygon._removeLastVertex();
    this.drawnVertexCount--;
    if (this.drawnVertexCount == 0) {
      this.toggleDrawMode(false);
    }
  }

  private editFeature(fid: number, layer: L.Layer): void {
    const feature = this.features.get(fid)!;
    this.addToFeatureEditUndoStack([feature]);
    feature.geometry.coordinates = this.leafletService.layerToPoints(layer);
    feature.properties.simplifyTolerance = 0;
    layer.setPopupContent(this.createFeaturePopup(fid));
  }

  private cutFeature(feature: Feature<Polygon | MultiPolygon, any>, prevFeature: Feature<Polygon, any>): void {
    if (!feature) { // Feature is cutted out completely.
      this.removeFeature(prevFeature, true);
      return;
    }

    const undoFeatures = [prevFeature];

    const copy = JSON.parse(JSON.stringify(feature));
    copy.properties = {};
    const features = this.leafletService.splitPolygonFeature(copy);

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

    this.featureLayers.get(feature.properties.fid)!.remove();
    this.removeFeature(feature as any);
    this.removeFeature(prevFeature);
  }

  private mergeFeatures(features: Feature<Polygon, any>[]): void {
    if (features.length === 0) {
      return;
    }

    const mergedFeature = this.leafletService.mergeFeatures(features);
    const newFeatures = this.leafletService.splitPolygonFeature(mergedFeature);

    const undoFeatures = [];

    for (const feature of newFeatures) {
      this.featuresLayer.addData(feature);

      const prevFeature = JSON.parse(JSON.stringify(feature));
      prevFeature.geometry = null;
      undoFeatures.push(prevFeature);
    }

    this.addToFeatureEditUndoStack(undoFeatures.concat(features));
    features.forEach(feature => this.removeFeature(feature));
  }

  private createConvexHull(features: Feature<Polygon, any>[]): void {
    const convexHullFeature = this.leafletService.createConvexHullFeature(features);
    if (convexHullFeature === null) {
      return;
    }

    this.featuresLayer.addData(convexHullFeature);

    const prevFeature = JSON.parse(JSON.stringify(convexHullFeature));
    prevFeature.geometry = null;
    this.addToFeatureEditUndoStack(features.concat(prevFeature));

    features.forEach(feature => this.removeFeature(feature));
  }

  private simplifyFeature(fid: number, openPopup: boolean = false): boolean {
    const feature = this.features.get(fid)!;
    let simplifiedFeature = feature;
    let isSimplified = false;
    while (this.leafletService.hasNonTriangularRing(simplifiedFeature) &&
      feature.properties.simplifyTolerance <= this.maxSimplifyTolerance &&
      this.leafletService.haveEqualPolygons(feature, simplifiedFeature)) {
      simplifiedFeature = this.leafletService.simplifyFeature(feature, ++feature.properties.simplifyTolerance);
      isSimplified = true;
    }

    this.features.set(fid, simplifiedFeature);
    this.updateFeatureLayer(fid, openPopup);

    return isSimplified;
  }

  private simplifyFeatures(features: Feature<Polygon, any>[]): void {
    const simplifiedFeatures: Feature<Polygon, any>[] = [];

    for (const feature of features) {
      const copy = JSON.parse(JSON.stringify(feature));
      const isSimplified = this.simplifyFeature(feature.properties.fid);
      if (isSimplified) {
        simplifiedFeatures.push(copy);
      }
    }

    this.addToFeatureEditUndoStack(simplifiedFeatures);
  }

  private removeHoles(fid: number, openPopup: boolean = false) {
    const feature = this.features.get(fid)!
    feature.geometry.coordinates = this.leafletService.removeInnerRings(feature.geometry.coordinates as L.PointTuple[][]);
    this.updateFeatureLayer(fid, openPopup);
  }

  private removeHolesInFeatures(features: Feature<Polygon, any>[]): void {
    const featuresWithHole: Feature<Polygon, any>[] = [];

    for (const feature of features) {
      if (feature.geometry.coordinates.length > 1) {
        featuresWithHole.push(JSON.parse(JSON.stringify(feature)));
        this.removeHoles(feature.properties.fid);
      }
    }

    this.addToFeatureEditUndoStack(featuresWithHole);
  }

  private removeFeature(feature: Feature<Polygon, any>, undo: boolean = false) {
    if (undo) {
      this.addToFeatureEditUndoStack([feature]);
    }
    const fid = feature.properties.fid;
    this.features.delete(fid);
    this.selectedFids.delete(fid);
    this.featuresLayer.removeLayer(this.featureLayers.get(fid)!);
    this.featureLayers.delete(fid);
  }

  private removeFeatures(features: Feature<Polygon, any>[], undo: boolean = false) {
    if (undo) {
      this.addToFeatureEditUndoStack(features);
    }
    features.forEach(feature => this.removeFeature(feature));
  }

  private saveChanges(): void {
    const annotationData: AnnotationData = {
      features: Array.from(this.features.values()),
    };

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
      next => this.updateAnnotationData(),
      error => window.alert('Failed to reset segments and grades!')
    )
  }

  private showStatistics(): void {
    const button = document.getElementById('show-statistics-button')!;
    this.statisticsComponent.show(button, this.features);
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
        this.removeFeature(feature);
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

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload($event: BeforeUnloadEvent) {
    if (this.unsavedChanges) {
      $event.preventDefault();
      $event.returnValue = '';
    }
  }
}
