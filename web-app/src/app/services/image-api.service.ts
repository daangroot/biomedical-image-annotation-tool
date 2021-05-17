import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ImageMetadata } from '../types/image-metadata.type';

@Injectable({
  providedIn: 'root'
})
export class ImageApiService {
  private readonly imageEndpoint: string = 'api/images';

  constructor(private http: HttpClient) { }

  postImage(file: File): Observable<{}> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(this.imageEndpoint, formData);
  }

  deleteImage(id: string): Observable<{}> {
    return this.http.delete(`${this.imageEndpoint}/${id}`);
  }

  fetchImageMetadata(id: string): Observable<ImageMetadata> {
    return this.http.get<ImageMetadata>(`${this.imageEndpoint}/${id}/metadata`);
  }

  fetchAllImageMetadata(): Observable<ImageMetadata[]> {
    return this.http.get<ImageMetadata[]>(this.imageEndpoint + '/metadata');
  }
}
