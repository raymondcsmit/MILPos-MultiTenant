import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { HttpEventType } from '@angular/common/http';

import { InquiryAttachmentService } from './inquiry-attachment.service';
import { InquiryAttachment } from '@core/domain-classes/inquiry-attachment';

describe('InquiryAttachmentService', () => {
  let service: InquiryAttachmentService;
  let httpMock: HttpTestingController;

  const attachment: InquiryAttachment = { id: 'a1', name: 'file.pdf' } as InquiryAttachment;

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), InquiryAttachmentService],
    });
    service = TestBed.inject(InquiryAttachmentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getInquiryAttachments GETs inquiryAttachment/{inquiryId} and emits the list', () => {
    let result: InquiryAttachment[] | undefined;
    service.getInquiryAttachments('q1').subscribe((r) => (result = r));
    const req = expectUrl('GET', 'inquiryAttachment/q1');
    req.flush([attachment]);
    expect(result).toEqual([attachment]);
  });

  it('saveInquiryAttachment POSTs inquiryAttachment/ with the body', () => {
    let result: InquiryAttachment | undefined;
    service.saveInquiryAttachment(attachment).subscribe((r) => (result = r));
    const req = expectUrl('POST', 'inquiryAttachment/');
    expect(req.request.body).toBe(attachment);
    req.flush(attachment);
    expect(result).toEqual(attachment);
  });

  it('updateInquiryAttachment PUTs inquiryAttachment/{id} with the body', () => {
    service.updateInquiryAttachment('a1', attachment).subscribe();
    const req = expectUrl('PUT', 'inquiryAttachment/a1');
    expect(req.request.body).toBe(attachment);
    req.flush(attachment);
  });

  it('deleteInquiryAttachment DELETEs inquiryAttachment/{id}', () => {
    let result: boolean | undefined;
    service.deleteInquiryAttachment('a1').subscribe((r) => (result = r));
    const req = expectUrl('DELETE', 'inquiryAttachment/a1');
    expect(req.request.method).toBe('DELETE');
    req.flush(true);
    expect(result).toBe(true);
  });

  it('downloadFile GETs inquiryAttachment/{id}/download as a blob with progress events', () => {
    const events: any[] = [];
    service.downloadFile('a1').subscribe((e) => events.push(e));
    const req = expectUrl('GET', 'inquiryAttachment/a1/download');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['x']), { status: 200, statusText: 'OK' });
    expect(events.some((e) => e.type === HttpEventType.Response)).toBe(true);
  });
});
