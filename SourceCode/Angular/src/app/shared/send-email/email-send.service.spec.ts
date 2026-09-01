import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';

import { EmailSendService } from './email-send.service';
import { SendEmailRequest } from './send-email-request';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { CommonError } from '@core/error-handler/common-error';

describe('EmailSendService (shared/send-email)', () => {
  let service: EmailSendService;
  let httpMock: HttpTestingController;
  let errorHandler: jasmine.SpyObj<CommonHttpErrorService>;

  const request: SendEmailRequest = { to: 'a@x.com', subject: 'hi', body: 'yo' } as unknown as SendEmailRequest;

  beforeEach(() => {
    errorHandler = jasmine.createSpyObj<CommonHttpErrorService>('CommonHttpErrorService', ['handleError']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        EmailSendService,
        { provide: CommonHttpErrorService, useValue: errorHandler },
      ],
    });
    service = TestBed.inject(EmailSendService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('sendEmail POSTs Email (capitalized) with the body', () => {
    let done: boolean | undefined;
    service.sendEmail(request).subscribe(() => (done = true));
    const req = httpMock.expectOne((r) => r.method === 'POST' && r.url === 'Email');
    expect(req.request.body).toBe(request);
    req.flush(null);
    expect(done).toBe(true);
  });

  it('sendEmail propagates CommonError through handleError', () => {
    errorHandler.handleError.and.callFake((err: HttpErrorResponse) =>
      throwError(() => ({ statusText: err.statusText, code: err.status } as CommonError))
    );
    let error: any;
    service.sendEmail(request).subscribe({ error: (e) => (error = e) });
    httpMock
      .expectOne((r) => r.method === 'POST' && r.url === 'Email')
      .flush({ messages: ['smtp down'] }, { status: 500, statusText: 'Server Error' });
    expect(error.code).toBe(500);
    expect(errorHandler.handleError).toHaveBeenCalled();
  });

  it('sendEmailSalesOrPurchase POSTs email/salesOrPurchase with the body', () => {
    let done: boolean | undefined;
    service.sendEmailSalesOrPurchase(request).subscribe(() => (done = true));
    const req = httpMock.expectOne((r) => r.method === 'POST' && r.url === 'email/salesOrPurchase');
    expect(req.request.body).toBe(request);
    req.flush(null);
    expect(done).toBe(true);
  });
});
