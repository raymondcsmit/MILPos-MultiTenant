import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { CustomerService } from './customer.service';
import { CustomerResourceParameter } from '@core/domain-classes/customer-resource-parameter';

describe('CustomerService', () => {
  let service: CustomerService;
  let httpMock: HttpTestingController;

  function makeParams(overrides: Partial<CustomerResourceParameter> = {}): CustomerResourceParameter {
    const p = new CustomerResourceParameter();
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
      providers: [provideHttpClient(), provideHttpClientTesting(), CustomerService],
    });
    service = TestBed.inject(CustomerService);
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

  describe('getCustomers', () => {
    it('GETs customer with observe response and full params', () => {
      const body = [{ id: 'c1' }];
      let result: any;
      service
        .getCustomers(makeParams({ customerName: 'Acme', mobileNo: '123', phoneNo: '456', email: 'a@b.c', contactPerson: 'Bob', website: 'x.y', id: 'c1' }))
        .subscribe((r) => (result = r));
      const req = expectUrl('GET', 'customer');
      expectParams(req, {
        fields: '',
        orderBy: 'name asc',
        pageSize: '25',
        skip: '0',
        searchQuery: '',
        customerName: 'Acme',
        mobileNo: '123',
        phoneNo: '456',
        email: 'a@b.c',
        contactPerson: 'Bob',
        website: 'x.y',
        id: 'c1',
      });
      req.flush(body);
      expect(result.body).toEqual(body);
    });

    it('passes empty id when unset', () => {
      service.getCustomers(makeParams()).subscribe();
      const req = expectUrl('GET', 'customer');
      expect(req.request.params.get('id')).toBe('');
      req.flush([]);
    });
  });

  describe('getCustomersForDropDown', () => {
    it('GETs customerSearch with baked params and trimmed search', () => {
      const body = [{ id: 'c1', name: 'Acme' }];
      let result: any;
      service.getCustomersForDropDown(' Acme ', 'c1').subscribe((r) => (result = r));
      const req = httpMock.expectOne('customerSearch?isPOS=false&searchQuery=Acme&pageSize=10&id=c1');
      expect(req.request.method).toBe('GET');
      req.flush(body);
      expect(result).toEqual(body);
    });

    it('uses isPOS=true and empty searchQuery when no search', () => {
      service.getCustomersForDropDown('', undefined, true).subscribe();
      const req = httpMock.expectOne('customerSearch?isPOS=true&searchQuery=&pageSize=10&id=');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });
  });

  describe('CRUD', () => {
    it('getCustomer GETs customer/{id}', () => {
      const customer = { id: 'c1', name: 'Acme' } as any;
      let result: any;
      service.getCustomer('c1').subscribe((r) => (result = r));
      const req = expectUrl('GET', 'customer/c1');
      req.flush(customer);
      expect(result).toEqual(customer);
    });

    it('saveCustomer POSTs customer with the body', () => {
      const customer = { id: 'c1', name: 'Acme' } as any;
      let result: any;
      service.saveCustomer(customer).subscribe((r) => (result = r));
      const req = expectUrl('POST', 'customer');
      expect(req.request.body).toBe(customer);
      req.flush(customer);
      expect(result).toEqual(customer);
    });

    it('updateCustomer PUTs customer/{id} with the body', () => {
      const customer = { id: 'c1', name: 'Acme' } as any;
      service.updateCustomer('c1', customer).subscribe();
      const req = expectUrl('PUT', 'customer/c1');
      expect(req.request.body).toBe(customer);
      req.flush(customer);
    });

    it('deleteCustomer DELETEs customer/{id}', () => {
      service.deleteCustomer('c1').subscribe();
      const req = expectUrl('DELETE', 'customer/c1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('getCustomerPayments', () => {
    it('GETs customer/getcustomerpayment with observe response and params', () => {
      const body = [{ id: 'pay1' }];
      let result: any;
      service.getCustomerPayments(makeParams({ customerName: 'Acme', locationId: 'l1' })).subscribe((r) => (result = r));
      const req = expectUrl('GET', 'customer/getcustomerpayment');
      expectParams(req, {
        pageSize: '25',
        skip: '0',
        customerName: 'Acme',
        locationId: 'l1',
      });
      req.flush(body);
      expect(result.body).toEqual(body);
    });

    it('defaults locationId to empty string', () => {
      service.getCustomerPayments(makeParams()).subscribe();
      const req = expectUrl('GET', 'customer/getcustomerpayment');
      expect(req.request.params.get('locationId')).toBe('');
      req.flush([]);
    });
  });
});
