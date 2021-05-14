import { Component, Input, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-mask-upload',
  templateUrl: './mask-upload.component.html',
  styleUrls: ['./mask-upload.component.css']
})
export class MaskUploadComponent implements OnInit {
  @Input() bioImageId!: string;
  file: File | null = null;
  isUploading: boolean = false;

  constructor(private apiService: ApiService) {
  }

  ngOnInit(): void {
  }

  fileChange(event: any): void {
    const fileList: FileList = event.target.files;
    this.file = fileList.length > 0 ? fileList[0] : null;
  }

  uploadMask(): void {
    if (!this.file) {
      return;
    }

    this.isUploading = true;

    this.apiService.postMask(this.bioImageId, this.file)
      .subscribe(
        next => window.location.reload(),
        error => {
          this.isUploading = false;
          window.alert('Failed to upload mask!');
        }
      )
  }
}
