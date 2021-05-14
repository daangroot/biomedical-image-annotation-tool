import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MaskExportComponent } from './mask-export.component';

describe('MaskExportComponent', () => {
  let component: MaskExportComponent;
  let fixture: ComponentFixture<MaskExportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MaskExportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MaskExportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
