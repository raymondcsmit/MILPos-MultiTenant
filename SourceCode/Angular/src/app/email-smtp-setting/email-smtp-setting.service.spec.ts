import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';

import { EmailSmtpSettingService } from './email-smtp-setting.service';
import { EmailSMTPSetting } from '@core/domain-classes/email-smtp-setting';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { CommonError } from '@core/error-handler/common-error';

describe('EmailSmtpSettingService', () => {
  let service: EmailSmtpSettingService;
  let httpMock: HttpTestingController;
  let errorHandler: jasmine.SpyObj<CommonHttpErrorService>;

  const setting: EmailSMTPSetting = { id: 's1', host: 'smtp.x.com', port: 587 } as EmailSMTPSetting;

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  beforeEach(() => {
    errorHandler = jasmine.createSpyObj<CommonHttpErrorService>('CommonHttpErrorService', ['handleError']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        EmailSmtpSettingService,
        { provide: CommonHttpErrorService, useValue: errorHandler },
      ],
    });
    service = TestBed.inject(EmailSmtpSettingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getEmailSMTPSettings GETs emailSMTPSetting and emits the list', () => {
    let result: EmailSMTPSetting[] | undefined;
    service.getEmailSMTPSettings().subscribe((r) => (result = r));
    const req = expectUrl('GET', 'emailSMTPSetting');
    req.flush([setting]);
    expect(result).toEqual([setting]);
  });

  it('getEmailSMTPSetting GETs emailSMTPSetting/{id}', () => {
    let result: any;
    service.getEmailSMTPSetting('s1').subscribe((r) => (result = r));
    const req = expectUrl('GET', 'emailSMTPSetting/s1');
    req.flush(setting);
    expect(result).toEqual(setting);
  });

  it('addEmailSMTPSetting POSTs emailSMTPSetting with the body', () => {
    let result: any;
    service.addEmailSMTPSetting(setting).subscribe((r) => (result = r));
    const req = expectUrl('POST', 'emailSMTPSetting');
    expect(req.request.body).toBe(setting);
    req.flush(setting);
    expect(result).toEqual(setting);
  });

  it('updateEmailSMTPSetting PUTs emailSMTPSetting/{id} with the body', () => {
    service.updateEmailSMTPSetting(setting).subscribe();
    const req = expectUrl('PUT', 'emailSMTPSetting/s1');
    expect(req.request.body).toBe(setting);
    req.flush(setting);
  });

  it('deleteEmailSMTPSetting DELETEs emailSMTPSetting/{id}', () => {
    service.deleteEmailSMTPSetting('s1').subscribe();
    const req = expectUrl('DELETE', 'emailSMTPSetting/s1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('testEmailSMTPSetting POSTs EmailSMTPSetting/test with the body', () => {
    let result: any;
    service.testEmailSMTPSetting(setting).subscribe((r) => (result = r));
    const req = expectUrl('POST', 'EmailSMTPSetting/test');
    expect(req.request.body).toBe(setting);
    req.flush(true);
    expect(result).toBe(true);
  });

  it('addEmailSMTPSetting propagates CommonError through handleError', () => {
    errorHandler.handleError.and.callFake((err: HttpErrorResponse) =>
      throwError(() => ({ statusText: err.statusText, code: err.status } as CommonError))
    );
    let error: any;
    service.addEmailSMTPSetting(setting).subscribe({ error: (e) => (error = e) });
    expectUrl('POST', 'emailSMTPSetting').flush(
      { messages: ['bad'] },
      { status: 422, statusText: 'Unprocessable Entity' }
    );
    expect(error.code).toBe(422);
    expect(errorHandler.handleError).toHaveBeenCalled();
  });
});
