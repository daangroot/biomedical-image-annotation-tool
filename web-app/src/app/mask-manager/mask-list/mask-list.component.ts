import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { environment } from '../../../environments/environment';
import { MaskExportComponent } from '../../mask-export/mask-export.component';
import { MaskApiService } from '../../services/mask-api.service';
import { ImageMetadata } from '../../types/image-metadata.type';

@Component({
  selector: 'app-mask-list',
  templateUrl: './mask-list.component.html',
  styleUrls: ['./mask-list.component.css']
})
export class MaskListComponent implements OnInit {
  @Input() imageId!: string;
  @ViewChild(MaskExportComponent) maskExportComponent!: MaskExportComponent;
  environment = environment;
  maskMetadataList: ImageMetadata[] = [];
  isLoading: boolean = false;
  isDataLoaded: boolean = false;
  deletedMaskId: string | null = null;

  constructor(private maskApiService: MaskApiService) { }

  ngOnInit(): void {
    this.getAllMaskInfos();
  }

  getAllMaskInfos(): void {
    this.isLoading = true;
    this.isDataLoaded = false;

    this.maskApiService.fetchAllMaskMetadata(this.imageId)
      .subscribe(
        metadata => {
          this.maskMetadataList = metadata;
          this.isLoading = false;
          this.isDataLoaded = true;
        },
        error => this.isLoading = false
      )
  }

  deleteMask(id: string): void {
    if (!window.confirm("Are you sure you want to delete this mask?"))
      return;

    this.deletedMaskId = id;

    this.maskApiService.deleteMask(this.imageId, id)
      .subscribe(
        next => this.getAllMaskInfos(),
        error => {
          this.deletedMaskId = null;
          window.alert("Failed to delete mask!");
        }
      )
  }
}
