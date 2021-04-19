import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ImageInfo } from '../types/image-info.type';

@Injectable({
  providedIn: 'root'
})
export class ImageService {
  private readonly imagesDataUrl: string = 'api/images';

  constructor(private http: HttpClient) { }

  getImageInfos(): Observable<ImageInfo[]> {
    return this.http.get<ImageInfo[]>(this.imagesDataUrl);
  }

  addImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);

    const params = new HttpParams();
    const options = {
      params: params
    };

    return this.http.post(this.imagesDataUrl, formData, options);
  }
}
