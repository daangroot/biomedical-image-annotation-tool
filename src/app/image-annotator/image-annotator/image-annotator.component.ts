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
  imageId!: string;
  imageInfo!: ImageInfo;
  maskInfos!: ImageInfo[];
  navBarHeight!: number;

  constructor(
    private route: ActivatedRoute,
    private imageService: ImageService) { }

  ngOnInit(): void {
    const routeParams: ParamMap = this.route.snapshot.paramMap;
    this.imageId = routeParams.get('imageId')!;

    this.getImageInfo();
    this.getMaskInfos();

    this.navBarHeight = document.getElementById("navbar")!.clientHeight;
  }

  private getImageInfo(): void {
    this.imageService.getImageInfo(this.imageId)
      .subscribe(
        imageInfo => this.imageInfo = imageInfo
      )
  }

  private getMaskInfos(): void {
    this.imageService.getMaskInfos(this.imageId)
      .subscribe(
        maskInfos => this.maskInfos = maskInfos
      )
  }
}
