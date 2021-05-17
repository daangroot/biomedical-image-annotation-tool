import { Input } from '@angular/core';
import { Component, OnInit } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ImageMetadata } from '../../types/image-metadata.type';

@Component({
  selector: 'app-image-info',
  templateUrl: './image-info.component.html',
  styleUrls: ['./image-info.component.css']
})
export class ImageInfoComponent implements OnInit {
  @Input() imageMetadata!: ImageMetadata;
  environment = environment;

  constructor() { }

  ngOnInit(): void {
  }
}
