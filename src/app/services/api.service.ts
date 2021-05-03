import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ImageInfo } from '../types/image-info.type';
import { GeoJson } from '../types/geojson.type';

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

  postBioImage(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post(this.imagesDataUrl, formData);
  }

  deleteBioImage(id: string): Observable<any> {
    return this.http.delete(`${this.imagesDataUrl}/${id}`);
  }

  fetchMaskInfo(bioImageId: string, maskId: string): Observable<ImageInfo> {
    return this.http.get<ImageInfo>(`${this.imagesDataUrl}/${bioImageId}/masks/${maskId}/info`);
  }

  fetchMaskInfos(bioImageId: string): Observable<ImageInfo[]> {
    return this.http.get<ImageInfo[]>(`${this.imagesDataUrl}/${bioImageId}/masks/info`);
  }

  fetchGeoJson(bioImageId: string, maskId: string): Observable<GeoJson[]> {
    return this.http.get<GeoJson[]>(`${this.imagesDataUrl}/${bioImageId}/masks/${maskId}/geojson`);
  }

  postMask(bioImageId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post(`${this.imagesDataUrl}/${bioImageId}/masks`, formData);
  }

  deleteMask(bioImageId: string, maskId: string): Observable<any> {
    return this.http.delete(`${this.imagesDataUrl}/${bioImageId}/masks/${maskId}`);
  }
}
