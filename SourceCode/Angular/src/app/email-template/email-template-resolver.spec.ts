import { TestBed } from '@angular/core/testing';
import { ResolveFn } from '@angular/router';

import { EmailTemplateResolver } from './email-template-resolver';

describe('emailTemplateResolver', () => {
  const executeResolver: ResolveFn<boolean> = (...resolverParameters) => 
      TestBed.runInInjectionContext(() => EmailTemplateResolver(...resolverParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
