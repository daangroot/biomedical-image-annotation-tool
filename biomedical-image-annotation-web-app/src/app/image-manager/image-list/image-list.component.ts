import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { ImageInfo } from '../../types/image-info.type';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-image-list',
  templateUrl: './image-list.component.html',
  styleUrls: ['./image-list.component.css']
})
export class ImageListComponent implements OnInit {
  environment = environment;
  imageInfos: ImageInfo[] = [];
  isLoading: boolean = false;
  isDataLoaded: boolean = false;
  deletedImageId: string | null = null;

  constructor(private apiService: ApiService) { }

  ngOnInit(): void {
    this.getAllImageInfos();
  }

  getAllImageInfos(): void {
    this.isLoading = true;
    this.isDataLoaded = false;

    this.apiService.fetchBioImageInfos()
      .subscribe(
        imageInfos => {
          this.imageInfos = imageInfos;
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

    this.apiService.deleteBioImage(id)
      .subscribe(
        next => this.getAllImageInfos(),
        error => {
          this.deletedImageId = null;
          window.alert("Failed to delete image!");
        }
      )
  }
}
