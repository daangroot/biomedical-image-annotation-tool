import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ImageManagerComponent } from './image-manager/image-manager.component';
import { ImageManagerRoutingModule } from './image-manager-routing.module';
import { ImageListComponent } from './image-list/image-list.component';
import { ImageUploadComponent } from './image-upload/image-upload.component';


@NgModule({
  declarations: [
    ImageManagerComponent,
    ImageListComponent,
    ImageUploadComponent
  ],
  imports: [
    CommonModule,
    ImageManagerRoutingModule
  ],
  exports: [
    ImageManagerComponent
  ]
})
export class ImageManagerModule { }
