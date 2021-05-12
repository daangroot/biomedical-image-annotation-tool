import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HeaderService {
  private bioImageDataSource = new Subject<[string, string]>();
  bioImageData$ = this.bioImageDataSource.asObservable();
  private maskImageDataSource = new Subject<[string, string]>();
  maskImageData$ = this.maskImageDataSource.asObservable();

  constructor() { }

  setBioImageData(id: string, name: string) {
    this.bioImageDataSource.next([id, name]);
  }

  setMaskImageData(id: string, name: string) {
    this.maskImageDataSource.next([id, name]);
  }
}
