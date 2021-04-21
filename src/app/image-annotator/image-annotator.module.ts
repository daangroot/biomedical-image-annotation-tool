import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageAnnotatorComponent } from './image-annotator/image-annotator.component';
import { ImageAnnotatorRoutingModule } from './image-annotator-routing.module';
import { LeafletComponent } from './leaflet/leaflet.component';


@NgModule({
  declarations: [
    ImageAnnotatorComponent,
    LeafletComponent
  ],
  imports: [
    CommonModule,
    ImageAnnotatorRoutingModule
  ],
  exports: [
    ImageAnnotatorComponent
  ]
})
export class ImageAnnotatorModule { }
