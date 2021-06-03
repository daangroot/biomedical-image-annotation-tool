import { AfterViewInit, Component } from '@angular/core';
import { Modal } from 'bootstrap';
import { environment } from '../../environments/environment';
import { FileSaveService } from '../services/file-save.service';
import { MaskApiService } from '../services/mask-api.service';
import { AnnotationData } from '../types/annotation-data.type';
import { ImageMetadata } from '../types/image-metadata.type';

@Component({
  selector: 'app-mask-export',
  templateUrl: './mask-export.component.html',
  styleUrls: ['./mask-export.component.css']
})
export class MaskExportComponent implements AfterViewInit {
  imageId!: string;
  maskId!: string;
  maskMetadata!: ImageMetadata;
  private modal!: Modal;
  environment = environment;
  isLoading: boolean = false;

  imageUrl: string = '';

  constructor(
    private maskApiService: MaskApiService,
    private fileSaveService: FileSaveService
  ) { }

  ngAfterViewInit(): void {
    const element = document.getElementById('mask-export-modal')!;
    this.modal = new Modal(element);
  }

  show(imageId: string, maskMetadata: ImageMetadata) {
    this.imageId = imageId;
    this.maskId = maskMetadata.id;
    this.maskMetadata = maskMetadata;

    this.updateImageUrl();

    this.modal.show();
  }

  exportAnnotationData() {
    this.isLoading = true;
    this.maskApiService.fetchAnnotationData(this.imageId, this.maskId).subscribe(
      annotationData => {
        this.isLoading = false;
        this.saveAnnotationData(annotationData)
      },
      error => window.alert('Failed to retrieve annotation data from server!')
    )
  }

  private saveAnnotationData(annotationData: AnnotationData) {
    const json = JSON.stringify(annotationData);
    const originalName = this.maskMetadata.originalName;
    const filename = (originalName.substr(0, originalName.lastIndexOf('.')) || originalName) + '.json';
    this.fileSaveService.saveJson(json, filename);
  }

  updateImageUrl(): void {
    const includeTruePositives = document.getElementById('includeTruePositives') as HTMLInputElement;
    const includeFalsePositives = document.getElementById('includeFalsePositives') as HTMLInputElement;
    const includeFalseNegatives = document.getElementById('includeFalseNegatives') as HTMLInputElement;
    const grayscale = document.getElementById('export-grayscale') as HTMLInputElement;

    const newUrl = new URL(`/api/images/${this.imageId}/masks/${this.maskId}`, environment.apiUrl);
    newUrl.searchParams.append('true-positive', includeTruePositives.checked ? '1' : '0');
    newUrl.searchParams.append('false-positive', includeFalsePositives.checked ? '1' : '0');
    newUrl.searchParams.append('false-negative', includeFalseNegatives.checked ? '1' : '0');
    newUrl.searchParams.append('grayscale', grayscale.checked ? '1' : '0');
    this.imageUrl = newUrl.toString();
  }
}
