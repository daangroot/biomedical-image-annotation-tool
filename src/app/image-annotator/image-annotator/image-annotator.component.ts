import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import * as OpenSeadragon from 'openseadragon';

import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-image-annotator',
  templateUrl: './image-annotator.component.html',
  styleUrls: ['./image-annotator.component.css']
})
export class ImageAnnotatorComponent implements OnInit {

  constructor(private route: ActivatedRoute) { }

  ngOnInit(): void {
    const routeParams: ParamMap = this.route.snapshot.paramMap;
    const imageId: string | null = routeParams.get('imageId');

    const viewer: OpenSeadragon.Viewer = OpenSeadragon({
      id: 'openseadragon-viewer',
      prefixUrl: 'https://openseadragon.github.io/openseadragon/images/',
      tileSources: `${environment.apiUrl}/api/images/${imageId}/dzi/dzi.dzi`
    });
  }

}
