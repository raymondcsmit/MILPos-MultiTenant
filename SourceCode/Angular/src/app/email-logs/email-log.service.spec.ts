import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { throwError } from 'rxjs';

import { EmailLogService } from './email-log.service';
import { EmailLogResource } from '@core/domain-classes/email-log-Resource';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { CommonError } from '@core/error-handler/common-error';

describe('EmailLogService', () => {
  let service: EmailLogService;
  let httpMock: HttpTestingController;
  let errorHandler: jasmine.SpyObj<CommonHttpErrorService>;

  function makeResource(overrides: Partial<EmailLogResource> = {}): EmailLogResource {
    const p = new EmailLogResource();
    p.fields = '';
    p.orderBy = 'createdDate desc';
    p.pageSize = 25;
    p.skip = 0;
    p.searchQuery = '';
    p.senderEmail = '';
    p.recipientEmail = '';
    p.subject = '';
    Object.assign(p, overrides);
    return p;
  }

  beforeEach(() => {
    errorHandler = jasmine.createSpyObj<CommonHttpErrorService>('CommonHttpErrorService', ['handleError']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        EmailLogService,
        { provide: CommonHttpErrorService, useValue: errorHandler },
      ],
    });
    service = TestBed.inject(EmailLogService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getEmailLogs GETs emaillog with observe response and full params', () => {
    const body = [{ id: 'l1' }];
    let result: any;
    service
      .getEmailLogs(makeResource({ senderEmail: 'a@x.com', recipientEmail: 'b@x.com', subject: 'hi' }))
      .subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === 'emaillog');
    expect(req.request.params.get('senderEmail')).toBe('a@x.com');
    expect(req.request.params.get('recipientEmail')).toBe('b@x.com');
    expect(req.request.params.get('subject')).toBe('hi');
    expect(req.request.params.get('pageSize')).toBe('25');
    expect(req.request.params.get('skip')).toBe('0');
    req.flush(body);
    expect(result.body).toEqual(body);
  });

  it('getEmailLogs defaults null emails/subject to empty strings', () => {
    service.getEmailLogs(makeResource({ senderEmail: null, recipientEmail: null, subject: null } as any)).subscribe();
    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === 'emaillog');
    expect(req.request.params.get('senderEmail')).toBe('');
    expect(req.request.params.get('recipientEmail')).toBe('');
    expect(req.request.params.get('subject')).toBe('');
    req.flush([]);
  });

  it('downloadAttachment GETs emaillog/{id}/download as a blob with progress events', () => {
    const events: any[] = [];
    service.downloadAttachment('l1').subscribe((e) => events.push(e));
    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === 'emaillog/l1/download');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['pdf']));
    expect(events.some((e) => e.type === HttpEventType.Response)).toBe(true);
  });

  it('deleteEmailLog DELETEs emaillog/{id}', () => {
    service.deleteEmailLog('l1').subscribe();
    const req = httpMock.expectOne((r) => r.method === 'DELETE' && r.url === 'emaillog/l1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('deleteEmailLog propagates CommonError through handleError', () => {
    errorHandler.handleError.and.callFake((err: HttpErrorResponse) =>
      throwError(() => ({ statusText: err.statusText, code: err.status } as CommonError))
    );
    let error: any;
    service.deleteEmailLog('l1').subscribe({ error: (e) => (error = e) });
    httpMock
      .expectOne((r) => r.method === 'DELETE' && r.url === 'emaillog/l1')
      .flush({ messages: ['nope'] }, { status: 422, statusText: 'Unprocessable Entity' });
    expect(error.code).toBe(422);
    expect(errorHandler.handleError).toHaveBeenCalled();
  });
});
