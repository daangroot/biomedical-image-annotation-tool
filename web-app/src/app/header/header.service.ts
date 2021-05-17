import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { ImageMetadata } from '../types/image-metadata.type';

@Injectable({
  providedIn: 'root'
})
export class HeaderService {
  private imageMetadataSource = new Subject<ImageMetadata>();
  imageMetadata$ = this.imageMetadataSource.asObservable();
  private maskMetadataSource = new Subject<ImageMetadata>();
  maskMetadata$ = this.maskMetadataSource.asObservable();

  constructor() { }

  setImageMetadata(metadata: ImageMetadata) {
    this.imageMetadataSource.next(metadata);
  }

  setMaskMetadata(metadata: ImageMetadata) {
    this.maskMetadataSource.next(metadata);
  }
}
