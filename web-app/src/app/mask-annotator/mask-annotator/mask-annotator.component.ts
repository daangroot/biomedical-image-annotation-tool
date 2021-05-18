import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { HeaderService } from '../../header/header.service';
import { ImageApiService } from '../../services/image-api.service';
import { MaskApiService } from '../../services/mask-api.service';
import { ImageMetadata } from '../../types/image-metadata.type';

@Component({
  selector: 'app-mask-annotator',
  templateUrl: './mask-annotator.component.html',
  styleUrls: ['./mask-annotator.component.css']
})
export class MaskAnnotatorComponent implements OnInit {
  imageId!: string;
  maskId!: string;
  imageMetadata!: ImageMetadata;
  maskMetadata!: ImageMetadata;
  
  constructor(
    private route: ActivatedRoute,
    private imageApiService: ImageApiService,
    private maskApiService: MaskApiService,
    private headerService: HeaderService
  ) { }

  ngOnInit(): void {
    const routeParams: ParamMap = this.route.snapshot.paramMap;
    this.imageId = routeParams.get('imageId')!;
    this.maskId = routeParams.get('maskId')!;
    this.getMetadata();
  }

  private getMetadata(): void {
    this.imageApiService.fetchImageMetadata(this.imageId).subscribe(
      metadata => {
        this.imageMetadata = metadata;
        this.headerService.setImageMetadata(metadata);
      },
      error => window.alert('Failed to retrieve image metadata from server!')
    )

    this.maskApiService.fetchMaskMetadata(this.imageId, this.maskId).subscribe(
      metadata => {
        this.maskMetadata = metadata;
        this.headerService.setMaskMetadata(metadata);
      },
      error => window.alert('Failed to retrieve mask metadata from server!')
    )
  }
}
