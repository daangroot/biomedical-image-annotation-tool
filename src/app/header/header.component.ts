import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { HeaderService } from './header.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, AfterViewInit {
  @ViewChild('header')
  private header!: ElementRef;

  constructor(private headerService: HeaderService) { }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.headerService.headerHeight = this.header.nativeElement.offsetHeight;
  }
}
