import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { HeaderService } from '../../header/header.service';
import { ApiService } from '../../services/api.service';
import { ImageInfo } from '../../types/image-info.type';

@Component({
  selector: 'app-mask-annotator',
  templateUrl: './mask-annotator.component.html',
  styleUrls: ['./mask-annotator.component.css']
})
export class MaskAnnotatorComponent implements OnInit {
  bioImageInfo!: ImageInfo;
  maskId!: string;
  maskInfo!: ImageInfo;
  
  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private headerService: HeaderService
  ) { }

  ngOnInit(): void {
    const routeParams: ParamMap = this.route.snapshot.paramMap;
    const bioImageId: string = routeParams.get('imageId')!;
    this.maskId = routeParams.get('maskId')!;

    this.getBioImageInfo(bioImageId);
    this.getMaskInfo(bioImageId, this.maskId);
  }

  private getBioImageInfo(id: string): void {
    this.apiService.fetchBioImageInfo(id)
      .subscribe(
        info => {
          this.bioImageInfo = info;
          this.headerService.setBioImageData(info.id, info.originalName);
        },
        error => window.alert('Failed to get data from server!')
      )
  }

  private getMaskInfo(bioImageid: string, maskId: string): void {
    this.apiService.fetchMaskInfo(bioImageid, maskId)
      .subscribe(
        info => {
          this.maskInfo = info;
          this.headerService.setMaskImageData(info.id, info.originalName);
        },
        error => window.alert('Failed to get data from server!')
      )
  }
}
