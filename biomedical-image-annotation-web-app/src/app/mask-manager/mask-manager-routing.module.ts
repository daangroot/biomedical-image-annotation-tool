import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MaskManagerComponent } from './mask-manager/mask-manager.component';


const routes: Routes = [
  {
    path: '',
    component: MaskManagerComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MaskManagerRoutingModule { }
