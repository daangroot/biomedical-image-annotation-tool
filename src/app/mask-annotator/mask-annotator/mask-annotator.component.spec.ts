import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MaskAnnotatorComponent } from './mask-annotator.component';

describe('MaskAnnotatorComponent', () => {
  let component: MaskAnnotatorComponent;
  let fixture: ComponentFixture<MaskAnnotatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MaskAnnotatorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MaskAnnotatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
