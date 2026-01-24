import { TestBed } from '@angular/core/testing';
import { ResolveFn } from '@angular/router';

import { supplierDetailResolver } from './supplier-detail-resolver';

describe('supplierDetailResolver', () => {
  const executeResolver: ResolveFn<boolean> = (...resolverParameters) => 
      TestBed.runInInjectionContext(() => supplierDetailResolver(...resolverParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
