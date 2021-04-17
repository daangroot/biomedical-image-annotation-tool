import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';


const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./image-manager/image-manager.module').then(m => m.ImageManagerModule)
  },
  {
    path: 'images/:imageId',
    loadChildren: () => import('./image-annotator/image-annotator.module').then(m => m.ImageAnnotatorModule)
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
