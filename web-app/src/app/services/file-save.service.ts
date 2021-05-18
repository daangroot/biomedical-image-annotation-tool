import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FileSaveService {

  constructor() { }

  saveJson(json: any, filename: string): void {
    const blob = new Blob([json], {
      type: 'application/json'
    });
    this.saveFile(blob, filename);
  }

  private saveFile(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);

    const element = document.createElement('a');
    element.href = url;
    element.download = filename;

    document.body.appendChild(element);
    element.click();

    setTimeout(() => {
      document.body.removeChild(element);
      URL.revokeObjectURL(url);
    }, 0);
  }
}
