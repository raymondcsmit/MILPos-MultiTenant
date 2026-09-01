import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { SupplierService } from './supplier.service';
import { SupplierResourceParameter, SupplierPaymentResourceParameter } from '@core/domain-classes/supplier-resource-parameter';

describe('SupplierService', () => {
  let service: SupplierService;
  let httpMock: HttpTestingController;

  function makeParams(overrides: Partial<SupplierResourceParameter> = {}): SupplierResourceParameter {
    const p = new SupplierResourceParameter();
    p.fields = '';
    p.orderBy = 'name asc';
    p.pageSize = 25;
    p.skip = 0;
    p.searchQuery = '';
    p.name = '';
    Object.assign(p, overrides);
    return p;
  }

  function makePaymentParams(overrides: Partial<SupplierPaymentResourceParameter> = {}): SupplierPaymentResourceParameter {
    const p = new SupplierPaymentResourceParameter();
    p.fields = '';
    p.orderBy = 'name asc';
    p.pageSize = 25;
    p.skip = 0;
    p.searchQuery = '';
    p.name = '';
    Object.assign(p, overrides);
    return p;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), SupplierService],
    });
    service = TestBed.inject(SupplierService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  function expectParams(req: any, expected: Record<string, string>) {
    const actual = req.request.params;
    Object.keys(expected).forEach((k) => {
      expect(actual.get(k)).toBe(expected[k]);
    });
  }

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getSuppliers', () => {
    it('GETs supplier with observe response and full params', () => {
      const body = [{ id: 's1' }];
      let result: any;
      service
        .getSuppliers(makeParams({ supplierName: 'Acme', mobileNo: '123', email: 'a@b.c', country: 'PK', website: 'x.y', id: 's1' }))
        .subscribe((r) => (result = r));
      const req = expectUrl('GET', 'supplier');
      expectParams(req, {
        fields: '',
        orderBy: 'name asc',
        pageSize: '25',
        skip: '0',
        searchQuery: '',
        supplierName: 'Acme',
        mobileNo: '123',
        email: 'a@b.c',
        country: 'PK',
        website: 'x.y',
        id: 's1',
      });
      req.flush(body);
      expect(result.body).toEqual(body);
    });

    it('passes empty country/website/id when unset', () => {
      service.getSuppliers(makeParams()).subscribe();
      const req = expectUrl('GET', 'supplier');
      expectParams(req, { country: '', website: '', id: '' });
      req.flush([]);
    });
  });

  describe('getSuppliersForDropDown', () => {
    it('GETs SupplierSearch with baked params and trimmed search', () => {
      const body = [{ id: 's1', name: 'Acme' }];
      let result: any;
      service.getSuppliersForDropDown(' Acme ', 's1').subscribe((r) => (result = r));
      const req = httpMock.expectOne('SupplierSearch?searchQuery=Acme&pageSize=10&id=s1');
      expect(req.request.method).toBe('GET');
      req.flush(body);
      expect(result).toEqual(body);
    });

    it('uses empty searchQuery when no search', () => {
      service.getSuppliersForDropDown('').subscribe();
      const req = httpMock.expectOne('SupplierSearch?searchQuery=&pageSize=10&id=');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });
  });

  describe('CRUD', () => {
    it('getSupplier GETs supplier/{id}', () => {
      const supplier = { id: 's1', name: 'Acme' } as any;
      let result: any;
      service.getSupplier('s1').subscribe((r) => (result = r));
      const req = expectUrl('GET', 'supplier/s1');
      req.flush(supplier);
      expect(result).toEqual(supplier);
    });

    it('saveSupplier POSTs supplier with the body', () => {
      const supplier = { id: 's1', name: 'Acme' } as any;
      let result: any;
      service.saveSupplier(supplier).subscribe((r) => (result = r));
      const req = expectUrl('POST', 'supplier');
      expect(req.request.body).toBe(supplier);
      req.flush(supplier);
      expect(result).toEqual(supplier);
    });

    it('updateSupplier PUTs supplier/{id} with the body', () => {
      const supplier = { id: 's1', name: 'Acme' } as any;
      service.updateSupplier('s1', supplier).subscribe();
      const req = expectUrl('PUT', 'supplier/s1');
      expect(req.request.body).toBe(supplier);
      req.flush(supplier);
    });

    it('deleteSupplier DELETEs supplier/{id}', () => {
      service.deleteSupplier('s1').subscribe();
      const req = expectUrl('DELETE', 'supplier/s1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('getSupplierPayments', () => {
    it('GETs supplier/getsupplierpayment with observe response and params', () => {
      const body = [{ id: 'pay1' }];
      let result: any;
      service.getSupplierPayments(makePaymentParams({ supplierName: 'Acme', locationId: 'l1' })).subscribe((r) => (result = r));
      const req = expectUrl('GET', 'supplier/getsupplierpayment');
      expectParams(req, {
        pageSize: '25',
        skip: '0',
        supplierName: 'Acme',
        locationId: 'l1',
      });
      req.flush(body);
      expect(result.body).toEqual(body);
    });

    it('defaults locationId to empty string', () => {
      service.getSupplierPayments(makePaymentParams()).subscribe();
      const req = expectUrl('GET', 'supplier/getsupplierpayment');
      expect(req.request.params.get('locationId')).toBe('');
      req.flush([]);
    });
  });
});
