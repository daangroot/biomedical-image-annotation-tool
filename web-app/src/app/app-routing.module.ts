import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';


const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./image-manager/image-manager.module').then(m => m.ImageManagerModule)
  },
  {
    path: 'images/:imageId',
    loadChildren: () => import('./mask-manager/mask-manager.module').then(m => m.MaskManagerModule)
  },
  {
    path: 'images/:imageId/masks/:maskId',
    loadChildren: () => import('./mask-annotator/mask-annotator.module').then(m => m.MaskAnnotatorModule)
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
