import { TestBed } from '@angular/core/testing';
import { ResolveFn } from '@angular/router';

import { RecoverPasswordResolver } from './recover-password-resolver';

describe('RecoverPasswordResolver', () => {
  const executeResolver: ResolveFn<boolean> = (...resolverParameters) =>
      TestBed.runInInjectionContext(() => RecoverPasswordResolver(...resolverParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
