import { AfterViewInit, Component } from '@angular/core';

import * as bootstrap from 'bootstrap';
import { Feature, Polygon } from 'geojson';
import { MaskMetadata } from 'src/app/types/mask-metadata.type';

@Component({
  selector: 'app-mask-export',
  templateUrl: './mask-export.component.html',
  styleUrls: ['./mask-export.component.css']
})
export class MaskExportComponent implements AfterViewInit {

  private modal!: bootstrap.Modal;
  private features: Feature<Polygon, any>[] | null = null;
  private metadata: MaskMetadata | null = null;

  constructor() { }

  ngAfterViewInit(): void {
    const element = document.getElementById('mask-export-modal')!;
    this.modal = new bootstrap.Modal(element);
  }

  show(features: Feature<Polygon, any>[], metadata: MaskMetadata) {
    this.features = features;
    this.metadata = metadata;
    this.modal.show();
  }

  exportJSON() {
    const json = JSON.stringify({
      metadata: this.metadata,
      features: this.features,
    });

    const blob = new Blob([json], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);

    const element = document.createElement('a');
    element.href = url;
    element.download = 'export.json';

    document.body.appendChild(element);
    element.click();

    setTimeout(() => {
      document.body.removeChild(element);
      URL.revokeObjectURL(url);
    }, 0);
  }

}
