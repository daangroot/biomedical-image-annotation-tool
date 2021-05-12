import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MaskAnnotatorComponent } from './mask-annotator/mask-annotator.component';


const routes: Routes = [
  {
    path: '',
    component: MaskAnnotatorComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MaskAnnotatorRoutingModule { }
