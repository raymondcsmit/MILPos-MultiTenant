import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { InquirySourceService } from './inquiry-source.service';
import { InquirySource } from '@core/domain-classes/inquiry-source';

describe('InquirySourceService', () => {
  let service: InquirySourceService;
  let httpMock: HttpTestingController;

  const source: InquirySource = { id: 's1', name: 'Phone' } as InquirySource;

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), InquirySourceService],
    });
    service = TestBed.inject(InquirySourceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getAll GETs InquirySources and emits the list', () => {
    let result: InquirySource[] | undefined;
    service.getAll().subscribe((r) => (result = r));
    const req = expectUrl('GET', 'InquirySources');
    req.flush([source]);
    expect(result).toEqual([source]);
  });

  it('getById GETs InquirySource/{id}', () => {
    service.getById('s1').subscribe();
    const req = expectUrl('GET', 'InquirySource/s1');
    expect(req.request.method).toBe('GET');
    req.flush(source);
  });

  it('add POSTs InquirySource with the body', () => {
    let result: InquirySource | undefined;
    service.add(source).subscribe((r) => (result = r));
    const req = expectUrl('POST', 'InquirySource');
    expect(req.request.body).toBe(source);
    req.flush(source);
    expect(result).toEqual(source);
  });

  it('update PUTs InquirySource/{id} with the body', () => {
    service.update('s1', source).subscribe();
    const req = expectUrl('PUT', 'InquirySource/s1');
    expect(req.request.body).toBe(source);
    req.flush(source);
  });

  it('delete DELETEs InquirySource/{id}', () => {
    service.delete('s1').subscribe();
    const req = expectUrl('DELETE', 'InquirySource/s1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
