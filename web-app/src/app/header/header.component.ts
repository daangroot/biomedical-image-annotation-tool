import { Component, OnInit } from '@angular/core';
import { ImageMetadata } from '../types/image-metadata.type';
import { HeaderService } from './header.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  imageMetadata!: ImageMetadata;
  maskMetadata!: ImageMetadata;
  
  constructor(private headerService: HeaderService) { }

  ngOnInit(): void {
    this.headerService.imageMetadata$.subscribe(
      metadata => this.imageMetadata = metadata
    )

    this.headerService.maskMetadata$.subscribe(
      metadata => this.maskMetadata = metadata
    )
  }
}
