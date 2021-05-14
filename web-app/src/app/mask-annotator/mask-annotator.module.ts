import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaskAnnotatorComponent } from './mask-annotator/mask-annotator.component';
import { MaskAnnotatorRoutingModule } from './mask-annotator-routing.module';
import { LeafletComponent } from './leaflet/leaflet.component';
import { MaskExportModule } from '../mask-export/mask-export.module';



@NgModule({
  declarations: [
    MaskAnnotatorComponent,
    LeafletComponent
  ],
  imports: [
    CommonModule,
    MaskAnnotatorRoutingModule,
    MaskExportModule
  ]
})
export class MaskAnnotatorModule { }
