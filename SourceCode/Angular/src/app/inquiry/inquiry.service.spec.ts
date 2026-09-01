import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { InquiryService } from './inquiry.service';
import { InquiryResourceParameter } from '@core/domain-classes/inquiry-resource-parameter';

describe('InquiryService', () => {
  let service: InquiryService;
  let httpMock: HttpTestingController;

  function makeParams(overrides: Partial<InquiryResourceParameter> = {}): InquiryResourceParameter {
    const p = new InquiryResourceParameter();
    p.fields = '';
    p.orderBy = 'companyName asc';
    p.pageSize = 25;
    p.skip = 0;
    p.searchQuery = '';
    p.name = '';
    Object.assign(p, overrides);
    return p;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), InquiryService],
    });
    service = TestBed.inject(InquiryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getInquiries', () => {
    it('GETs inquiry with observe response and full params', () => {
      const body = [{ id: 'q1' }];
      let result: any;
      service
        .getInquiries(
          makeParams({
            companyName: 'Acme',
            mobileNo: '123',
            city: 'Lahore',
            phoneNo: '456',
            email: 'a@b.c',
            assignTo: 'u1',
            inquiryStatusId: 's1',
            inquirySourceId: 'src1',
            contactPerson: 'Bob',
          })
        )
        .subscribe((r) => (result = r));
      const req = expectUrl('GET', 'inquiry');
      const params = req.request.params;
      expect(params.get('fields')).toBe('');
      expect(params.get('orderBy')).toBe('companyName asc');
      expect(params.get('pageSize')).toBe('25');
      expect(params.get('skip')).toBe('0');
      expect(params.get('searchQuery')).toBe('');
      expect(params.get('companyName')).toBe('Acme');
      expect(params.get('mobileNo')).toBe('123');
      expect(params.get('cityName')).toBe('Lahore');
      expect(params.get('phoneNo')).toBe('456');
      expect(params.get('email')).toBe('a@b.c');
      expect(params.get('assignTo')).toBe('u1');
      expect(params.get('inquiryStatusId')).toBe('s1');
      expect(params.get('inquirySourceId')).toBe('src1');
      expect(params.get('contactPerson')).toBe('Bob');
      req.flush(body);
      expect(result.body).toEqual(body);
    });

    it('passes empty strings for unset optional filters', () => {
      service.getInquiries(makeParams()).subscribe();
      const req = expectUrl('GET', 'inquiry');
      const params = req.request.params;
      expect(params.get('companyName')).toBe('');
      expect(params.get('cityName')).toBe('');
      expect(params.get('assignTo')).toBe('');
      expect(params.get('inquiryStatusId')).toBe('');
      expect(params.get('inquirySourceId')).toBe('');
      req.flush([]);
    });
  });

  describe('CRUD', () => {
    it('getInquiry GETs inquiry/{id}', () => {
      const inquiry = { id: 'q1', companyName: 'Acme' } as any;
      let result: any;
      service.getInquiry('q1').subscribe((r) => (result = r));
      const req = expectUrl('GET', 'inquiry/q1');
      req.flush(inquiry);
      expect(result).toEqual(inquiry);
    });

    it('saveInquiry POSTs inquiry with the body', () => {
      const inquiry = { id: 'q1', companyName: 'Acme' } as any;
      let result: any;
      service.saveInquiry(inquiry).subscribe((r) => (result = r));
      const req = expectUrl('POST', 'inquiry');
      expect(req.request.body).toBe(inquiry);
      req.flush(inquiry);
      expect(result).toEqual(inquiry);
    });

    it('updateInquiry PUTs inquiry/{id} with the body', () => {
      const inquiry = { id: 'q1', companyName: 'Acme' } as any;
      service.updateInquiry('q1', inquiry).subscribe();
      const req = expectUrl('PUT', 'inquiry/q1');
      expect(req.request.body).toBe(inquiry);
      req.flush(inquiry);
    });

    it('deleteInquiry DELETEs inquiry/{id}', () => {
      service.deleteInquiry('q1').subscribe();
      const req = expectUrl('DELETE', 'inquiry/q1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('getProductsByInquiryId', () => {
    it('GETs inquiry/{id}/products', () => {
      const body = [{ id: 'p1' }];
      let result: any;
      service.getProductsByInquiryId('q1').subscribe((r) => (result = r));
      const req = expectUrl('GET', 'inquiry/q1/products');
      expect(req.request.method).toBe('GET');
      req.flush(body);
      expect(result).toEqual(body);
    });
  });
});
