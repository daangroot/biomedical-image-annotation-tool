import { Component, OnInit } from '@angular/core';
import { ImageApiService } from '../../services/image-api.service';

@Component({
  selector: 'app-image-upload',
  templateUrl: './image-upload.component.html',
  styleUrls: ['./image-upload.component.css']
})
export class ImageUploadComponent implements OnInit {
  file: File | null = null;
  isUploading: boolean = false;

  constructor(private imageApiService: ImageApiService) { }

  ngOnInit(): void {
  }

  fileChange(event: any): void {
    const fileList: FileList = event.target.files;
    this.file = fileList.length > 0 ? fileList[0] : null;
  }

  uploadImage(): void {
    if (!this.file) {
      return;
    }

    this.isUploading = true;

    this.imageApiService.postImage(this.file)
      .subscribe(
        next => window.location.reload(),
        error => {
          this.isUploading = false;
          window.alert('Failed to upload image!');
        }
      )
  }
}
