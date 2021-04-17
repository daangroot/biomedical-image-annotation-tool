import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ImageManagerComponent } from './image-manager/image-manager.component';
import { ImageManagerRoutingModule } from './image-manager-routing.module';


@NgModule({
  declarations: [
    ImageManagerComponent
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
