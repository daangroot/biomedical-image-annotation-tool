import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ImageManagerComponent } from './image-manager/image-manager.component';


const routes: Routes = [
  {
    path: '',
    component: ImageManagerComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ImageManagerRoutingModule { }
