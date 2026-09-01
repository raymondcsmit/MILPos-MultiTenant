import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { InquiryStatusService } from './inquiry-status.service';
import { InquiryStatus } from '@core/domain-classes/inquiry-status';

describe('InquiryStatusService', () => {
  let service: InquiryStatusService;
  let httpMock: HttpTestingController;

  const status: InquiryStatus = { id: 'st1', name: 'Open' } as InquiryStatus;

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), InquiryStatusService],
    });
    service = TestBed.inject(InquiryStatusService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getAll GETs InquiryStatuses and emits the list', () => {
    let result: InquiryStatus[] | undefined;
    service.getAll().subscribe((r) => (result = r));
    const req = expectUrl('GET', 'InquiryStatuses');
    req.flush([status]);
    expect(result).toEqual([status]);
  });

  it('getById GETs InquiryStatus/{id}', () => {
    service.getById('st1').subscribe();
    const req = expectUrl('GET', 'InquiryStatus/st1');
    expect(req.request.method).toBe('GET');
    req.flush(status);
  });

  it('add POSTs InquiryStatus with the body', () => {
    let result: InquiryStatus | undefined;
    service.add(status).subscribe((r) => (result = r));
    const req = expectUrl('POST', 'InquiryStatus');
    expect(req.request.body).toBe(status);
    req.flush(status);
    expect(result).toEqual(status);
  });

  it('update PUTs InquiryStatus/{id} with the body', () => {
    service.update('st1', status).subscribe();
    const req = expectUrl('PUT', 'InquiryStatus/st1');
    expect(req.request.body).toBe(status);
    req.flush(status);
  });

  it('delete DELETEs InquiryStatus/{id}', () => {
    service.delete('st1').subscribe();
    const req = expectUrl('DELETE', 'InquiryStatus/st1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
