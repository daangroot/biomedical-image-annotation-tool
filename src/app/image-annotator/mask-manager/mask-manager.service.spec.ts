import { TestBed } from '@angular/core/testing';

import { MaskManagerService } from './mask-manager.service';

describe('MaskManagerService', () => {
  let service: MaskManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MaskManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
