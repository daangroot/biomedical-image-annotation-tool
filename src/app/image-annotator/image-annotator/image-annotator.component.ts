import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { ImageService } from '../../services/image.service';
import { ImageInfo } from '../../types/image-info.type';

@Component({
  selector: 'app-image-annotator',
  templateUrl: './image-annotator.component.html',
  styleUrls: ['./image-annotator.component.css']
})
export class ImageAnnotatorComponent implements OnInit {
  imageInfo!: ImageInfo;
  maskInfos!: ImageInfo[];

  constructor(
    private route: ActivatedRoute,
    private imageService: ImageService) { }

  ngOnInit(): void {
    const routeParams: ParamMap = this.route.snapshot.paramMap;
    const imageId: string = routeParams.get('imageId')!;

    this.getImageInfo(imageId);
    this.getMaskInfos(imageId);
  }

  private getImageInfo(imageId: string): void {
    this.imageService.getImageInfo(imageId)
      .subscribe(
        imageInfo => this.imageInfo = imageInfo,
        error => window.alert('Failed to get data from server!')
      )
  }

  private getMaskInfos(imageId: string): void {
    this.imageService.getMaskInfos(imageId)
      .subscribe(
        maskInfos => this.maskInfos = maskInfos
      )
  }
}
