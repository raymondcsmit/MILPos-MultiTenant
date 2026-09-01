import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { SalesPaymentReportService } from './sales-payment-report.service';
import { SalesOrderResourceParameter } from '@core/domain-classes/sales-order-resource-parameter';

describe('SalesPaymentReportService', () => {
  let service: SalesPaymentReportService;
  let httpMock: HttpTestingController;

  function makeParams(overrides: Partial<SalesOrderResourceParameter> = {}): SalesOrderResourceParameter {
    const p = new SalesOrderResourceParameter();
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
      providers: [provideHttpClient(), provideHttpClientTesting(), SalesPaymentReportService],
    });
    service = TestBed.inject(SalesPaymentReportService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getAllSalesOrderPaymentReport GETs salesorderpayment/report with observe response and params', () => {
    const body = [{ id: 'p1' }];
    let result: any;
    service
      .getAllSalesOrderPaymentReport(
        makeParams({
          orderNumber: 'SO-1',
          customerName: 'Acme',
          customerId: 'c1',
          productId: 'p1',
          locationId: 'l1',
          fromDate: new Date('2026-01-01T00:00:00Z'),
          toDate: new Date('2026-01-31T00:00:00Z'),
        })
      )
      .subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === 'salesorderpayment/report');
    expect(req.request.params.get('orderNumber')).toBe('SO-1');
    expect(req.request.params.get('customerName')).toBe('Acme');
    expect(req.request.params.get('customerId')).toBe('c1');
    expect(req.request.params.get('productId')).toBe('p1');
    expect(req.request.params.get('locationId')).toBe('l1');
    expect(req.request.params.get('fromDate')).toBe('2026-01-01T00:00:00.000Z');
    expect(req.request.params.get('toDate')).toBe('2026-01-31T00:00:00.000Z');
    expect(req.request.params.get('pageSize')).toBe('25');
    req.flush(body);
    expect(result.body).toEqual(body);
  });

  it('getAllSalesOrderPaymentReport defaults null optionals to empty strings', () => {
    service
      .getAllSalesOrderPaymentReport(
        makeParams({ orderNumber: null, customerName: null, fromDate: null, toDate: null } as any)
      )
      .subscribe();
    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === 'salesorderpayment/report');
    expect(req.request.params.get('orderNumber')).toBe('');
    expect(req.request.params.get('customerName')).toBe('');
    expect(req.request.params.get('fromDate')).toBe('');
    expect(req.request.params.get('toDate')).toBe('');
    req.flush([]);
  });

  it('getAllSalesOrderPaymentReportExcel GETs the same URL with pageSize/skip 0', () => {
    service.getAllSalesOrderPaymentReportExcel(makeParams()).subscribe();
    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === 'salesorderpayment/report');
    expect(req.request.params.get('pageSize')).toBe('0');
    expect(req.request.params.get('skip')).toBe('0');
    req.flush([]);
  });
});
