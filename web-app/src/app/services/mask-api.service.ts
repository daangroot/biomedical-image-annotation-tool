import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AnnotationData } from '../types/annotation-data.type';
import { ImageMetadata } from '../types/image-metadata.type';

@Injectable({
  providedIn: 'root'
})
export class MaskApiService {
  private readonly imageEndpoint: string = 'api/images';

  constructor(private http: HttpClient) { }

  postMask(imageId: string, file: File): Observable<{}> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.imageEndpoint}/${imageId}/masks`, formData);
  }

  deleteMask(imageId: string, maskId: string): Observable<{}> {
    return this.http.delete(`${this.imageEndpoint}/${imageId}/masks/${maskId}`);
  }

  fetchMaskMetadata(imageId: string, maskId: string): Observable<ImageMetadata> {
    return this.http.get<ImageMetadata>(`${this.imageEndpoint}/${imageId}/masks/${maskId}/metadata`);
  }

  fetchAllMaskMetadata(imageId: string): Observable<ImageMetadata[]> {
    return this.http.get<ImageMetadata[]>(`${this.imageEndpoint}/${imageId}/masks/info`);
  }

  fetchAnnotationData(imageId: string, maskId: string): Observable<AnnotationData> {
    return this.http.get<AnnotationData>(`${this.imageEndpoint}/${imageId}/masks/${maskId}/annotation-data`);
  }

  saveAnnotationData(imageId: string, maskId: string, annotationData: AnnotationData): Observable<{}> {
    return this.http.put(`${this.imageEndpoint}/${imageId}/masks/${maskId}/annotation-data`, annotationData);
  }

  resetAnnotationData(imageId: string, maskId: string): Observable<{}> {
    return this.http.delete(`${this.imageEndpoint}/${imageId}/masks/${maskId}/annotation-data`);
  }
}
