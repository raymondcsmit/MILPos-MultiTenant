import { TestBed } from '@angular/core/testing';
import { ResolveFn } from '@angular/router';

import { CustomerDetailResolver } from './customer-detail-resolver';

describe('customerDetailResolver', () => {
  const executeResolver: ResolveFn<boolean> = (...resolverParameters) => 
      TestBed.runInInjectionContext(() => CustomerDetailResolver(...resolverParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
