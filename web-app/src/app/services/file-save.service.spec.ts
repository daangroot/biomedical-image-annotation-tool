import { TestBed } from '@angular/core/testing';

import { FileSaveService } from './file-save.service';

describe('FileSaveService', () => {
  let service: FileSaveService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FileSaveService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
