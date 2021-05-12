import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaskManagerComponent } from './mask-manager/mask-manager.component';
import { MaskManagerRoutingModule } from './mask-manager-routing.module';
import { MaskListComponent } from './mask-list/mask-list.component';
import { MaskUploadComponent } from './mask-upload/mask-upload.component';
import { BioImageInfoComponent } from './bio-image-info/bio-image-info.component';



@NgModule({
  declarations: [
    MaskManagerComponent,
    MaskListComponent,
    MaskUploadComponent,
    BioImageInfoComponent
  ],
  imports: [
    CommonModule,
    MaskManagerRoutingModule
  ]
})
export class MaskManagerModule { }