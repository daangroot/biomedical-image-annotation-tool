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
  private drawFeatureControl!: L.Control;
  private cancelDrawFeatureControl!: L.Control;
  private cutFeatureControl!: L.Control;
  private cancelCutFeatureControl!: L.Control;
  private removeAllInnerPolygonsControl!: L.Control;
  private featureEditUndoControl!: L.Control;
  private sw!: L.PointTuple;
  private ne!: L.PointTuple;
  private swMax!: L.PointTuple;
  private neMax!: L.PointTuple;
  private readonly tileSize: number = 128;
  private maxNativeZoom!: number;
  private drawModeEnabled: boolean = false;
  private cutModeEnabled: boolean = false;
  private maxFid: number = -1;
  private features: Map<number, Feature<Polygon, any>> = new Map();
  private featureLayers: Map<number, L.Layer> = new Map();
  private featureEditUndoStack: Feature<Polygon, any>[][] = [];


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
      coordsToLatLng: (coords) => this.leafletService.toLatLng(coords as L.PointTuple),
      onEachFeature: (feature: Feature<Polygon, any>, layer) => this.onEachFeature(feature, layer),
      // @ts-ignore
      snapIgnore: true
    }).addTo(this.maskMap);

    this.maskMap.on('pm:create', (result) => {
      this.onFeatureCreated(result.layer);
      this.disableDrawMode();
    });

    this.maskMap.on('pm:cut', (result) => {
      // @ts-ignore
      this.onFeatureCutted(result.layer.feature, result.originalLayer.feature);
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

    const editDeleteContainer = L.DomUtil.create('div', 'mb-2', container);
    const editButton = L.DomUtil.create('button', 'btn btn-primary me-2', editDeleteContainer);
    editButton.innerHTML = 'Edit';
    editButton.onclick = () => {
      editButton.hidden = true;
      finishEditButton.hidden = false;
      layer.pm.enable({
        allowSelfIntersection: false,
        limitMarkersToCount: 256
      })
    };

    const finishEditButton = L.DomUtil.create('button', 'btn btn-primary me-2', editDeleteContainer);
    finishEditButton.innerHTML = 'Finish edit';
    finishEditButton.hidden = true
    finishEditButton.onclick = () => {
      editButton.hidden = false;
      finishEditButton.hidden = true;
      layer.pm.disable();
    };

    const deleteButton = L.DomUtil.create('button', 'btn btn-danger', editDeleteContainer);
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


    return container;
  }

  private createFeatureGradePopupHtml(fid: number): HTMLElement {
    const feature = this.features.get(fid)!;
    const gradingContainer = L.DomUtil.create('div', 'mb-3 container');

    // Segment score

    const scoreLabel = L.DomUtil.create('label', 'form-label', gradingContainer) as HTMLLabelElement;
    scoreLabel.htmlFor = `segment-score-${fid}`;
    scoreLabel.innerHTML = 'Segment score';

    const scoreContainer = L.DomUtil.create('div', 'input-group mb-3', gradingContainer);

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
    if (feature.properties.score) {
      scoreInput.value = feature.properties.score.toString();
    }

    const scoreText = L.DomUtil.create('span', 'input-group-text', scoreContainer);
    scoreText.innerHTML = '%';

    // True positives

    const truePositive = L.DomUtil.create('input', 'btn-check', gradingContainer) as HTMLInputElement;
    truePositive.type = 'radio';
    truePositive.name = `grading-radios-${fid}`;
    truePositive.id = `grading-radios-truepositive-${fid}`;
    truePositive.checked = feature.properties.grade === FeatureGrade.TruePositive;

    const truePositiveLabel = L.DomUtil.create('label', 'btn btn-outline-success', gradingContainer) as HTMLLabelElement;
    truePositiveLabel.innerHTML = 'True positive';
    truePositiveLabel.htmlFor = truePositive.id;
    truePositiveLabel.style.marginInlineEnd = '1rem';

    // False positives

    const falsePositive = L.DomUtil.create('input', 'btn-check', gradingContainer) as HTMLInputElement;
    falsePositive.type = 'radio';
    falsePositive.name = `grading-radios-${fid}`;
    falsePositive.id = `grading-radios-falsepositive-${fid}`;
    falsePositive.checked = feature.properties.grade === FeatureGrade.FalsePositive;

    const falsePositiveLabel = L.DomUtil.create('label', 'btn btn-outline-danger', gradingContainer) as HTMLLabelElement;
    falsePositiveLabel.innerHTML = 'False positive';
    falsePositiveLabel.htmlFor = falsePositive.id;

    const onChange = () => {
      let grade;
      if (truePositive.checked) {
        grade = FeatureGrade.TruePositive;
      } else if (falsePositive.checked) {
        grade = FeatureGrade.FalsePositive;
      }
      if (grade) {
        this.setFeatureGrade(fid, grade);
      }
    };

    truePositive.onchange = onChange;
    falsePositive.onchange = onChange;

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
  }

  private initControls(): void {
    L.control.zoom({
      position: 'bottomright'
    }).addTo(this.maskMap);

    this.leafletService.createSplitScreenControl(() => this.toggleBaseMap()).addTo(this.maskMap);
    this.leafletService.createMaskControl().addTo(this.maskMap);

    this.drawFeatureControl = this.leafletService.createDrawFeatureControl(() => this.enableDrawMode());
    this.cancelDrawFeatureControl = this.leafletService.createCancelDrawFeatureControl(() => this.disableDrawMode());
    this.cutFeatureControl = this.leafletService.createCutFeatureControl(() => this.enableCutMode());
    this.cancelCutFeatureControl = this.leafletService.createCancelCutFeatureControl(() => this.disableCutMode());
    this.removeAllInnerPolygonsControl = this.leafletService.createRemoveAllInnerPolygonsControl(() => this.removeAllInnerPolygons());
    this.featureEditUndoControl = this.leafletService.createFeatureEditUndoControl(() => this.undoFeatureEdit());

    this.leafletService.createTextControl(this.bioImageInfo.originalName, 'bottomleft').addTo(this.maskMap);
  }

  private updateTopLeftControls(): void {
    this.drawFeatureControl.remove();
    this.cancelDrawFeatureControl.remove();
    this.cutFeatureControl.remove();
    this.cancelCutFeatureControl.remove();
    this.removeAllInnerPolygonsControl.remove();

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

    this.removeAllInnerPolygonsControl.addTo(this.maskMap);
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

  private onEachFeature(feature: Feature<Polygon, any>, layer: L.Layer): void {
    let fid = 0;
    if (!feature.properties || feature.properties.FID == null) {
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

    this.features.set(fid, feature);
    this.featureLayers.set(fid, layer);

    layer.bindPopup(this.createFeaturePopup(fid));

    layer.on('pm:update', result =>
      this.onFeatureEdit(fid, result.layer)
    )
  }

  private onFeatureCreated(layer: L.Layer): void {
    layer.remove();

    const feature = this.leafletService.layerToFeature(layer);
    this.geoJsonLayer.addData(feature);

    const prevFeature = JSON.parse(JSON.stringify(feature));
    prevFeature.geometry = null;
    this.addToFeatureEditUndoStack([prevFeature]);
  }

  private onFeatureEdit(fid: number, layer: L.Layer): void {
    const feature = this.features.get(fid)!;
    this.addToFeatureEditUndoStack([feature]);
    feature.geometry.coordinates = this.leafletService.layerToPoints(layer);
  }

  private onFeatureCutted(feature: Feature<Polygon | MultiPolygon, any>, prevFeature: Feature<Polygon, any>): void {
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
    } else if (feature.geometry.type === 'MultiPolygon') {
      features = this.leafletService.splitMultiPolygonFeature(feature as Feature<MultiPolygon, any>);
    }

    for (const feature of features) {
      feature.geometry.coordinates = feature.geometry.coordinates.map(ring =>
        ring.map(latLng => {
          const point = this.maskMap.project([latLng[1], latLng[0]], this.maxNativeZoom);
          return [point.x, point.y];
        })
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
    this.leafletService.removeInnerPolygons(this.features.get(fid)!);
    this.updateFeatureLayer(fid, openPopup);
  }

  private removeAllInnerPolygons(): void {
    const featuresWithInner: Feature<Polygon, any>[] = [];

    this.features.forEach(feature => {
      const hasInnerPolygon = (feature.geometry as any).coordinates.length > 1;
      if (hasInnerPolygon) {
        featuresWithInner.push(JSON.parse(JSON.stringify(feature)));
        this.removeInnerPolygons(feature.properties.FID);
      }
    })

    this.addToFeatureEditUndoStack(featuresWithInner);
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
    prevFeatures.forEach(feature => {
      if (feature.geometry === null) {
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
