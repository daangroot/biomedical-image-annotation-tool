import { Component, Input, OnInit } from '@angular/core';

import { ImageService } from 'src/app/services/image.service';
import { ImageInfo } from 'src/app/types/image-info.type';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-image-properties',
  templateUrl: './image-properties.component.html',
  styleUrls: ['./image-properties.component.css']
})
export class ImagePropertiesComponent implements OnInit {
  @Input() imageInfo!: ImageInfo;
  @Input() maskInfos!: ImageInfo[];

  environment = environment;

  maskFile: File | null = null;
  isUploading = false;

  constructor(private imageService: ImageService) { }

  ngOnInit(): void { }

  fileChange(event: any): void {
    const fileList: FileList = event.target.files;
    this.maskFile = fileList.length > 0 ? fileList[0] : null;
  }

  uploadMask(): void {
    if (!this.imageInfo || !this.maskFile) {
      return;
    }

    this.isUploading = true;

    this.imageService.addMask(this.imageInfo.id, this.maskFile)
      .subscribe(
        next => window.location.reload(),
        error => {
          this.isUploading = false;
          window.alert('Failed to upload mask!');
        }
      )
  }

}
