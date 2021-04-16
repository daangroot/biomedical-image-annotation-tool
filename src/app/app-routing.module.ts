import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ImageListComponent } from './image-list/image-list.component';
import { ImageViewComponent } from './image-view/image-view.component';

const routes: Routes = [
  { path: '', component: ImageListComponent },
  { path: 'images/:imageId', component: ImageViewComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
