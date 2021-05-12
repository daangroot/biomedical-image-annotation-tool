import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaskAnnotatorComponent } from './mask-annotator/mask-annotator.component';
import { MaskAnnotatorRoutingModule } from './mask-annotator-routing.module';
import { LeafletComponent } from './leaflet/leaflet.component';



@NgModule({
  declarations: [
    MaskAnnotatorComponent,
    LeafletComponent
  ],
  imports: [
    CommonModule,
    MaskAnnotatorRoutingModule
  ]
})
export class MaskAnnotatorModule { }
