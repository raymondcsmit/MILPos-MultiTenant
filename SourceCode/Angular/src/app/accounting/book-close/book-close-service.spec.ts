import { TestBed } from '@angular/core/testing';

import { BookCloseService } from './book-close-service';

describe('BookCloseService', () => {
  let service: BookCloseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BookCloseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
