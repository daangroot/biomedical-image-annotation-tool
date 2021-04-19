import { Component, OnInit } from '@angular/core';
import { ImageService } from '../../services/image.service';
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
  isDataLoaded: boolean = true;

  constructor(private imageService: ImageService) { }

  ngOnInit(): void {
    this.getAllImageData();
  }

  getAllImageData(): void {
    this.isLoading = true;
    this.isDataLoaded = false;

    this.imageService.getImageInfos()
      .subscribe(
        imageInfos => {
          this.imageInfos = imageInfos;
          this.isLoading = false;
          this.isDataLoaded = true;
        },
        () => this.isLoading = false
      )
  }
}
