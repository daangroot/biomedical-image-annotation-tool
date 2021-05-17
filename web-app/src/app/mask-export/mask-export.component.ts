import { AfterViewInit, Component } from '@angular/core';

import { Modal } from 'bootstrap';
import { environment } from '../../environments/environment';
import { MaskApiService } from '../services/mask-api.service';
import { AnnotationData } from '../types/annotation-data.type';

@Component({
  selector: 'app-mask-export',
  templateUrl: './mask-export.component.html',
  styleUrls: ['./mask-export.component.css']
})
export class MaskExportComponent implements AfterViewInit {
  imageId!: string;
  maskId!: string;
  private modal!: Modal;
  environment = environment;

  constructor(private maskApiService: MaskApiService) { }

  ngAfterViewInit(): void {
    const element = document.getElementById('mask-export-modal')!;
    this.modal = new Modal(element);
  }

  show(imageId: string, maskId: string) {
    this.imageId = imageId;
    this.maskId = maskId;
    this.modal.show();
  }

  exportAnnotationData() {
    this.maskApiService.fetchAnnotationData(this.imageId, this.maskId).subscribe(
      annotationData => this.downloadAnnotationData(annotationData)
    )
  }

  private downloadAnnotationData(annotationData: AnnotationData) {
    const json = JSON.stringify(annotationData);
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

  exportImage() {

  }

}
