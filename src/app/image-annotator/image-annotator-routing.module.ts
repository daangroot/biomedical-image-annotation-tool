import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ImageAnnotatorComponent } from './image-annotator/image-annotator.component';


const routes: Routes = [
  {
    path: '',
    component: ImageAnnotatorComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ImageAnnotatorRoutingModule { }
