import { Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { Event } from '@angular/router';

import { ApiService } from 'src/app/services/api.service';
import { ImageInfo } from 'src/app/types/image-info.type';
import { environment } from 'src/environments/environment';
import { MaskManagerService } from './mask-manager.service';

@Component({
  selector: 'app-mask-manager',
  templateUrl: './mask-manager.component.html',
  styleUrls: ['./mask-manager.component.css']
})
export class MaskManagerComponent implements OnInit {
  @ViewChild('fileInput')
  fileInput!: ElementRef;

  @Input() bioImageInfo!: ImageInfo;
  maskInfos: ImageInfo[] = [];
  selectedMaskId: string | null = null;

  isLoading: boolean = true;
  isDataLoaded: boolean = false;
  isUploading: boolean = false;
  file: File | null = null;
  deletedMaskId: string | null = null;

  environment = environment;


  constructor(
    private apiService: ApiService,
    private maskManagerService: MaskManagerService
  ) { }

  ngOnInit(): void {
    this.fetchMaskInfos();
  }

  fileChange(event: any): void {
    const fileList: FileList = event.target.files;
    this.file = fileList.length > 0 ? fileList[0] : null;
  }

  selectMask(id: string): void {
    if (this.selectedMaskId !== id) {
      this.selectedMaskId = id;
    } else {
      this.selectedMaskId = null;
    }
    this.maskManagerService.setSelectedMask(this.selectedMaskId);
  }

  private fetchMaskInfos(): void {
    this.isLoading = true;
    this.isDataLoaded = false;

    this.apiService.fetchMaskInfos(this.bioImageInfo.id)
      .subscribe(
        infos => {
          this.maskInfos = infos
          this.isLoading = false;
          this.isDataLoaded = true;
        },
        error => this.isLoading = false
      )
  }

  uploadMask(event: MouseEvent): void {
    event.stopPropagation();

    if (!this.file) {
      return;
    }

    this.isUploading = true;

    this.apiService.postMask(this.bioImageInfo.id, this.file)
      .subscribe(
        next => {
          this.isUploading = false;
          this.file = null;
          this.fileInput.nativeElement.value = '';
          this.fetchMaskInfos();
        },
        error => {
          this.isUploading = false;
          window.alert('Failed to upload mask!');
        }
      )
  }

  deleteMask(event: MouseEvent, id: string): void {
    event.stopPropagation();

    if (!window.confirm("Are you sure you want to delete this mask?"))
      return;

    this.deletedMaskId = id;

    this.maskManagerService.setSelectedMask(null);

    this.apiService.deleteMask(this.bioImageInfo.id, id)
      .subscribe(
        next => this.fetchMaskInfos(),
        error => {
          this.deletedMaskId = null;
          window.alert("Failed to delete mask!");
        }
      )
  }
}
