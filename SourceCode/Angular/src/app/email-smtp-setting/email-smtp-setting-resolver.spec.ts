import { TestBed } from '@angular/core/testing';
import { ResolveFn } from '@angular/router';

import { EmailSmtpSettingResolver } from './email-smtp-setting-resolver';

describe('emailSmtpSettingResolver', () => {
  const executeResolver: ResolveFn<boolean> = (...resolverParameters) => 
      TestBed.runInInjectionContext(() => EmailSmtpSettingResolver(...resolverParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
