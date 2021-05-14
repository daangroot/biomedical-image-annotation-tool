import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Feature, Polygon } from 'geojson';
import { ImageInfo } from '../types/image-info.type';
import { MaskMetadata } from '../types/mask-metadata.type';


@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly imagesDataUrl: string = 'api/images';

  constructor(private http: HttpClient) { }

  fetchBioImageInfo(id: string): Observable<ImageInfo> {
    return this.http.get<ImageInfo>(`${this.imagesDataUrl}/${id}/info`);
  }

  fetchBioImageInfos(): Observable<ImageInfo[]> {
    return this.http.get<ImageInfo[]>(this.imagesDataUrl + '/info');
  }

  postBioImage(file: File): Observable<{}> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post(this.imagesDataUrl, formData);
  }

  deleteBioImage(id: string): Observable<{}> {
    return this.http.delete(`${this.imagesDataUrl}/${id}`);
  }

  fetchMaskInfo(bioImageId: string, maskId: string): Observable<ImageInfo> {
    return this.http.get<ImageInfo>(`${this.imagesDataUrl}/${bioImageId}/masks/${maskId}/info`);
  }

  fetchMaskInfos(bioImageId: string): Observable<ImageInfo[]> {
    return this.http.get<ImageInfo[]>(`${this.imagesDataUrl}/${bioImageId}/masks/info`);
  }

  fetchFeatures(bioImageId: string, maskId: string): Observable<Feature<Polygon, any>[]> {
    return this.http.get<Feature<Polygon, any>[]>(`${this.imagesDataUrl}/${bioImageId}/masks/${maskId}/geojson`);
  }

  putFeatures(bioImageId: string, maskId: string, features: Feature<Polygon, any>[]): Observable<{}> {
    return this.http.put(`${this.imagesDataUrl}/${bioImageId}/masks/${maskId}/geojson`, features);
  }

  deleteFeatures(bioImageId: string, maskId: string): Observable<{}> {
    return this.http.delete(`${this.imagesDataUrl}/${bioImageId}/masks/${maskId}/geojson`);
  }

  fetchMetadata(bioImageId: string, maskId: string): Observable<MaskMetadata> {
    return this.http.get<MaskMetadata>(`${this.imagesDataUrl}/${bioImageId}/masks/${maskId}/metadata`);
  }

  putMetadata(bioImageId: string, maskId: string, metadata: MaskMetadata): Observable<{}> {
    return this.http.put(`${this.imagesDataUrl}/${bioImageId}/masks/${maskId}/metadata`, metadata);
  }

  postMask(bioImageId: string, file: File): Observable<{}> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post(`${this.imagesDataUrl}/${bioImageId}/masks`, formData);
  }

  deleteMask(bioImageId: string, maskId: string): Observable<{}> {
    return this.http.delete(`${this.imagesDataUrl}/${bioImageId}/masks/${maskId}`);
  }
}
