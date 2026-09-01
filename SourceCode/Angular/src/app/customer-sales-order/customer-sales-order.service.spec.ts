import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { CustomerSalesOrderService } from './customer-sales-order.service';
import { CustomerSalesOrderResourceParameter } from './customer-sales-order-list/customer-sales-order-resource-parameter';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';

describe('CustomerSalesOrderService', () => {
  let service: CustomerSalesOrderService;
  let httpMock: HttpTestingController;
  let errorHandler: jasmine.SpyObj<CommonHttpErrorService>;

  function makeParams(overrides: Partial<CustomerSalesOrderResourceParameter> = {}): CustomerSalesOrderResourceParameter {
    const p = new CustomerSalesOrderResourceParameter();
    p.fields = '';
    p.orderBy = 'orderNumber asc';
    p.pageSize = 25;
    p.skip = 0;
    p.searchQuery = '';
    p.name = '';
    p.orderNumber = '';
    p.customerName = '';
    Object.assign(p, overrides);
    return p;
  }

  beforeEach(() => {
    errorHandler = jasmine.createSpyObj<CommonHttpErrorService>('CommonHttpErrorService', ['handleError']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CustomerSalesOrderService,
        { provide: CommonHttpErrorService, useValue: errorHandler },
      ],
    });
    service = TestBed.inject(CustomerSalesOrderService);
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

  describe('getAllCustomerSalesOrder', () => {
    it('GETs SalesOrder/pendingsalesorder with observe response and full params incl dates', () => {
      const body = [{ id: 'so1' }];
      let result: any;
      service
        .getAllCustomerSalesOrder(
          makeParams({
            customerId: 'c1',
            orderNumber: 'SO-1',
            customerName: 'Acme',
            paymentStatus: 'PAID',
            soCreatedDate: new Date('2026-01-05T00:00:00Z'),
            fromDate: new Date('2026-01-01T00:00:00Z'),
            toDate: new Date('2026-01-31T00:00:00Z'),
          })
        )
        .subscribe((r) => (result = r));
      const req = expectUrl('GET', 'SalesOrder/pendingsalesorder');
      const params = req.request.params;
      expect(params.get('fields')).toBe('');
      expect(params.get('orderBy')).toBe('orderNumber asc');
      expect(params.get('pageSize')).toBe('25');
      expect(params.get('skip')).toBe('0');
      expect(params.get('searchQuery')).toBe('');
      expect(params.get('name')).toBe('');
      expect(params.get('customerId')).toBe('c1');
      expect(params.get('orderNumber')).toBe('SO-1');
      expect(params.get('customerName')).toBe('Acme');
      expect(params.get('paymentStatus')).toBe('PAID');
      expect(params.get('soCreatedDate')).toBe('2026-01-05T00:00:00.000Z');
      expect(params.get('fromDate')).toBe('2026-01-01T00:00:00.000Z');
      expect(params.get('toDate')).toBe('2026-01-31T00:00:00.000Z');
      req.flush(body);
      expect(result.body).toEqual(body);
    });

    it('passes empty strings for null dates and unset filters', () => {
      service.getAllCustomerSalesOrder(makeParams()).subscribe();
      const req = expectUrl('GET', 'SalesOrder/pendingsalesorder');
      const params = req.request.params;
      expect(params.get('customerId')).toBe('');
      expect(params.get('paymentStatus')).toBe('');
      expect(params.get('soCreatedDate')).toBe('');
      expect(params.get('fromDate')).toBe('');
      expect(params.get('toDate')).toBe('');
      req.flush([]);
    });
  });

  describe('getCustomerSalesOrderPayments', () => {
    it('GETs SalesOrder/customerpendingpayment/{customerId}', () => {
      const body = [{ id: 'pay1' }];
      let result: any;
      service.getCustomerSalesOrderPayments('c1').subscribe((r) => (result = r));
      const req = expectUrl('GET', 'SalesOrder/customerpendingpayment/c1');
      expect(req.request.method).toBe('GET');
      req.flush(body);
      expect(result).toEqual(body);
    });
  });
});
