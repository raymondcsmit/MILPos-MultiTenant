import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { EmailTemplateService } from './email-template.service';
import { EmailTemplate } from '@core/domain-classes/email-template';

describe('EmailTemplateService', () => {
  let service: EmailTemplateService;
  let httpMock: HttpTestingController;

  const template: EmailTemplate = { id: 't1', subject: 'Invoice', body: 'hello' } as EmailTemplate;

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), EmailTemplateService],
    });
    service = TestBed.inject(EmailTemplateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getEmailTemplates GETs emailTemplate and emits the list', () => {
    let result: EmailTemplate[] | undefined;
    service.getEmailTemplates().subscribe((r) => (result = r));
    const req = expectUrl('GET', 'emailTemplate');
    req.flush([template]);
    expect(result).toEqual([template]);
  });

  it('getEmailTemplate GETs emailTemplate/{id}', () => {
    let result: EmailTemplate | undefined;
    service.getEmailTemplate('t1').subscribe((r) => (result = r));
    const req = expectUrl('GET', 'emailTemplate/t1');
    req.flush(template);
    expect(result).toEqual(template);
  });

  it('addEmailTemplate POSTs emailTemplate with the body', () => {
    let result: EmailTemplate | undefined;
    service.addEmailTemplate(template).subscribe((r) => (result = r));
    const req = expectUrl('POST', 'emailTemplate');
    expect(req.request.body).toBe(template);
    req.flush(template);
    expect(result).toEqual(template);
  });

  it('updateEmailTemplate PUTs emailTemplate/{id} with the body', () => {
    service.updateEmailTemplate(template).subscribe();
    const req = expectUrl('PUT', 'emailTemplate/t1');
    expect(req.request.body).toBe(template);
    req.flush(template);
  });

  it('deleteEmailTemplate DELETEs emailTemplate/{id}', () => {
    service.deleteEmailTemplate(template).subscribe();
    const req = expectUrl('DELETE', 'emailTemplate/t1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
