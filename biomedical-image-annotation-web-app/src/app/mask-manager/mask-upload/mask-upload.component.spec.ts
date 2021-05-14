import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MaskUploadComponent } from './mask-upload.component';

describe('MaskUploadComponent', () => {
  let component: MaskUploadComponent;
  let fixture: ComponentFixture<MaskUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MaskUploadComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MaskUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
