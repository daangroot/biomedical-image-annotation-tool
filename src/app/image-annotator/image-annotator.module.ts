import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageAnnotatorComponent } from './image-annotator/image-annotator.component';
import { ImageAnnotatorRoutingModule } from './image-annotator-routing.module';
import { LeafletComponent } from './leaflet/leaflet.component';
import { MaskManagerComponent } from './mask-manager/mask-manager.component';


@NgModule({
  declarations: [
    ImageAnnotatorComponent,
    LeafletComponent,
    MaskManagerComponent
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
