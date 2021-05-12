import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { HeaderService } from '../../header/header.service';
import { ApiService } from '../../services/api.service';
import { ImageInfo } from '../../types/image-info.type';

@Component({
  selector: 'app-mask-manager',
  templateUrl: './mask-manager.component.html',
  styleUrls: ['./mask-manager.component.css']
})
export class MaskManagerComponent implements OnInit {
  bioImageId!: string;
  bioImageInfo!: ImageInfo;

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private headerService: HeaderService
  ) { }

  ngOnInit(): void {
    const routeParams: ParamMap = this.route.snapshot.paramMap;
    this.bioImageId = routeParams.get('imageId')!;
    this.getBioImageInfo(this.bioImageId);
  }

  getBioImageInfo(id: string): void {
    this.apiService.fetchBioImageInfo(id)
      .subscribe(
        imageInfo => {
          this.bioImageInfo = imageInfo;
          this.headerService.setBioImageData(imageInfo.id, imageInfo.originalName);
        },
        error => window.alert('Failed to retrieve image info from server!')
      )
  }
}
