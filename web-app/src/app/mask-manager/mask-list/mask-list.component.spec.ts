import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MaskListComponent } from './mask-list.component';

describe('MaskListComponent', () => {
  let component: MaskListComponent;
  let fixture: ComponentFixture<MaskListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MaskListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MaskListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
