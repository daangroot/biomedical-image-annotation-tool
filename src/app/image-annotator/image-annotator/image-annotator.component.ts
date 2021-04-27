import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ImageInfo } from '../../types/image-info.type';

@Component({
  selector: 'app-image-annotator',
  templateUrl: './image-annotator.component.html',
  styleUrls: ['./image-annotator.component.css']
})
export class ImageAnnotatorComponent implements OnInit {
  bioImageInfo!: ImageInfo;

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService) { }

  ngOnInit(): void {
    const routeParams: ParamMap = this.route.snapshot.paramMap;
    const bioImageId: string = routeParams.get('imageId')!;

    this.fetchBioImageInfo(bioImageId);
  }

  private fetchBioImageInfo(id: string): void {
    this.apiService.fetchBioImageInfo(id)
      .subscribe(
        info => this.bioImageInfo = info,
        error => window.alert('Failed to get data from server!')
      )
  }
}
