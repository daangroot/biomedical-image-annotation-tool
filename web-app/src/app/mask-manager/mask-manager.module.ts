import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaskManagerComponent } from './mask-manager/mask-manager.component';
import { MaskManagerRoutingModule } from './mask-manager-routing.module';
import { MaskListComponent } from './mask-list/mask-list.component';
import { MaskUploadComponent } from './mask-upload/mask-upload.component';
import { ImageInfoComponent } from './image-info/image-info.component';
import { MaskExportModule } from '../mask-export/mask-export.module';

@NgModule({
  declarations: [
    MaskManagerComponent,
    MaskListComponent,
    MaskUploadComponent,
    ImageInfoComponent
  ],
  imports: [
    CommonModule,
    MaskExportModule,
    MaskManagerRoutingModule
  ]
})
export class MaskManagerModule { }
