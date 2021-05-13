import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaskAnnotatorComponent } from './mask-annotator/mask-annotator.component';
import { MaskAnnotatorRoutingModule } from './mask-annotator-routing.module';
import { LeafletComponent } from './leaflet/leaflet.component';
import { MaskExportComponent } from './mask-export/mask-export.component';



@NgModule({
  declarations: [
    MaskAnnotatorComponent,
    LeafletComponent,
    MaskExportComponent
  ],
  imports: [
    CommonModule,
    MaskAnnotatorRoutingModule
  ]
})
export class MaskAnnotatorModule { }
