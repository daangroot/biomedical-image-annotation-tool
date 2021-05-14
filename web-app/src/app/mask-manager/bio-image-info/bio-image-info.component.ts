import { Input } from '@angular/core';
import { Component, OnInit } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ImageInfo } from '../../types/image-info.type';

@Component({
  selector: 'app-bio-image-info',
  templateUrl: './bio-image-info.component.html',
  styleUrls: ['./bio-image-info.component.css']
})
export class BioImageInfoComponent implements OnInit {
  @Input() bioImageInfo!: ImageInfo;
  environment = environment;

  constructor() { }

  ngOnInit(): void {
  }
}
