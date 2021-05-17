import { Component, OnInit } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ImageApiService } from '../../services/image-api.service';
import { ImageMetadata } from '../../types/image-metadata.type';

@Component({
  selector: 'app-image-list',
  templateUrl: './image-list.component.html',
  styleUrls: ['./image-list.component.css']
})
export class ImageListComponent implements OnInit {
  environment = environment;
  imageMetadataList: ImageMetadata[] = [];
  isLoading: boolean = false;
  isDataLoaded: boolean = false;
  deletedImageId: string | null = null;

  constructor(private imageApiService: ImageApiService) { }

  ngOnInit(): void {
    this.getImageMetaData();
  }

  getImageMetaData(): void {
    this.isLoading = true;
    this.isDataLoaded = false;

    this.imageApiService.fetchAllImageMetadata()
      .subscribe(
        metadata => {
          this.imageMetadataList = metadata;
          this.isLoading = false;
          this.isDataLoaded = true;
        },
        error => this.isLoading = false
      )
  }

  deleteImage(id: string): void {
    if (!window.confirm("Are you sure you want to delete this image?"))
      return;

    this.deletedImageId = id;

    this.imageApiService.deleteImage(id)
      .subscribe(
        next => this.getImageMetaData(),
        error => {
          this.deletedImageId = null;
          window.alert("Failed to delete image!");
        }
      )
  }
}
