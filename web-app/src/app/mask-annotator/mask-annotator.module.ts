import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaskAnnotatorComponent } from './mask-annotator/mask-annotator.component';
import { MaskAnnotatorRoutingModule } from './mask-annotator-routing.module';
import { LeafletComponent } from './leaflet/leaflet.component';
import { MaskExportModule } from '../mask-export/mask-export.module';
import { StatisticsComponent } from './statistics/statistics.component';

@NgModule({
  declarations: [
    MaskAnnotatorComponent,
    LeafletComponent,
    StatisticsComponent
  ],
  imports: [
    CommonModule,
    MaskExportModule,
    MaskAnnotatorRoutingModule
  ]
})
export class MaskAnnotatorModule { }
