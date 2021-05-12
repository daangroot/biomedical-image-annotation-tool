import { Component, Input, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { ImageInfo } from '../../types/image-info.type';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-mask-list',
  templateUrl: './mask-list.component.html',
  styleUrls: ['./mask-list.component.css']
})
export class MaskListComponent implements OnInit {
  @Input() bioImageId!: string;
  environment = environment;
  maskInfos: ImageInfo[] = [];
  isLoading: boolean = false;
  isDataLoaded: boolean = false;
  deletedMaskId: string | null = null;

  constructor(private apiService: ApiService) { }

  ngOnInit(): void {
    this.getAllMaskInfos();
  }

  getAllMaskInfos(): void {
    this.isLoading = true;
    this.isDataLoaded = false;

    this.apiService.fetchMaskInfos(this.bioImageId)
      .subscribe(
        maskInfos => {
          this.maskInfos = maskInfos;
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

    this.apiService.deleteMask(this.bioImageId, id)
      .subscribe(
        next => this.getAllMaskInfos(),
        error => {
          this.deletedMaskId = null;
          window.alert("Failed to delete mask!");
        }
      )
  }
}
