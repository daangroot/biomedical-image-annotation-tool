import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MaskManagerService {

  constructor() { }

  private maskSelectedSource = new Subject<string | null>();
  maskSelected$ = this.maskSelectedSource.asObservable();

  setSelectedMask(id: string | null) {
    this.maskSelectedSource.next(id);
  }
}
