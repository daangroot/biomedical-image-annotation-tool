import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { HeaderService } from '../../header/header.service';
import { ImageApiService } from '../../services/image-api.service';
import { ImageMetadata } from '../../types/image-metadata.type';

@Component({
  selector: 'app-mask-manager',
  templateUrl: './mask-manager.component.html',
  styleUrls: ['./mask-manager.component.css']
})
export class MaskManagerComponent implements OnInit {
  imageId!: string;
  imageMetadata!: ImageMetadata;

  constructor(
    private route: ActivatedRoute,
    private imageApiService: ImageApiService,
    private headerService: HeaderService
  ) { }

  ngOnInit(): void {
    const routeParams: ParamMap = this.route.snapshot.paramMap;
    this.imageId = routeParams.get('imageId')!;
    this.getImageMetadata();
  }

  getImageMetadata(): void {
    this.imageApiService.fetchImageMetadata(this.imageId).subscribe(
      metadata => {
        this.imageMetadata = metadata;
        this.headerService.setImageMetadata(metadata);
      },
      error => window.alert('Failed to retrieve image metadata from server!')
    )
  }
}
