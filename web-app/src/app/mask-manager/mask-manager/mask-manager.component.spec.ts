import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MaskManagerComponent } from './mask-manager.component';

describe('MaskManagerComponent', () => {
  let component: MaskManagerComponent;
  let fixture: ComponentFixture<MaskManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MaskManagerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MaskManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
