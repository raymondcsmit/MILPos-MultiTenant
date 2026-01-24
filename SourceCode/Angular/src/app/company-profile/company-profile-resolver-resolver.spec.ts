import { TestBed } from '@angular/core/testing';
import { ResolveFn } from '@angular/router';

import { companyProfileResolverResolver } from './company-profile-resolver-resolver';

describe('companyProfileResolverResolver', () => {
  const executeResolver: ResolveFn<boolean> = (...resolverParameters) => 
      TestBed.runInInjectionContext(() => companyProfileResolverResolver(...resolverParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
