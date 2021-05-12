import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BioImageInfoComponent } from './bio-image-info.component';

describe('BioImageInfoComponent', () => {
  let component: BioImageInfoComponent;
  let fixture: ComponentFixture<BioImageInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BioImageInfoComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BioImageInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
