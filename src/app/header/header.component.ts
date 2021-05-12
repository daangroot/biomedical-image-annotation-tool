import {  Component,  OnInit } from '@angular/core';
import { HeaderService } from './header.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  bioImageId: string | null = null;
  bioImageName: string | null = null;
  maskImageId: string | null = null;
  maskImageName: string | null = null;
  
  constructor(private headerService: HeaderService) { }

  ngOnInit(): void {
    this.headerService.bioImageData$.subscribe(data => {
      this.bioImageId = data[0];
      this.bioImageName = data[1];
    })
    this.headerService.maskImageData$.subscribe(data => {
      this.maskImageId = data[0];
      this.maskImageName = data[1];
    })
  }
}
