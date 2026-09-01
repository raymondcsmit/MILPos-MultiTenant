import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { PurchasePaymentReportService } from './purchase-payment-report.service';
import { PurchaseOrderResourceParameter } from '@core/domain-classes/purchase-order-resource-parameter';

describe('PurchasePaymentReportService', () => {
  let service: PurchasePaymentReportService;
  let httpMock: HttpTestingController;

  function makeParams(overrides: Partial<PurchaseOrderResourceParameter> = {}): PurchaseOrderResourceParameter {
    const p = new PurchaseOrderResourceParameter();
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
      providers: [provideHttpClient(), provideHttpClientTesting(), PurchasePaymentReportService],
    });
    service = TestBed.inject(PurchasePaymentReportService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getAllPurchaseOrderPaymentReport GETs purchaseorderpayment/report with observe response and params', () => {
    const body = [{ id: 'p1' }];
    let result: any;
    service
      .getAllPurchaseOrderPaymentReport(
        makeParams({
          orderNumber: 'PO-1',
          supplierName: 'Acme',
          supplierId: 's1',
          productId: 'p1',
          locationId: 'l1',
          fromDate: new Date('2026-01-01T00:00:00Z'),
          toDate: new Date('2026-01-31T00:00:00Z'),
        })
      )
      .subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === 'purchaseorderpayment/report');
    expect(req.request.params.get('orderNumber')).toBe('PO-1');
    expect(req.request.params.get('supplierName')).toBe('Acme');
    expect(req.request.params.get('supplierId')).toBe('s1');
    expect(req.request.params.get('productId')).toBe('p1');
    expect(req.request.params.get('locationId')).toBe('l1');
    expect(req.request.params.get('fromDate')).toBe('2026-01-01T00:00:00.000Z');
    expect(req.request.params.get('toDate')).toBe('2026-01-31T00:00:00.000Z');
    expect(req.request.params.get('pageSize')).toBe('25');
    req.flush(body);
    expect(result.body).toEqual(body);
  });

  it('getAllPurchaseOrderPaymentReport defaults null optionals to empty strings', () => {
    service
      .getAllPurchaseOrderPaymentReport(
        makeParams({ orderNumber: null, supplierName: null, fromDate: null, toDate: null } as any)
      )
      .subscribe();
    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === 'purchaseorderpayment/report');
    expect(req.request.params.get('orderNumber')).toBe('');
    expect(req.request.params.get('supplierName')).toBe('');
    expect(req.request.params.get('fromDate')).toBe('');
    expect(req.request.params.get('toDate')).toBe('');
    req.flush([]);
  });

  it('getAllPurchaseOrderPaymentReportExcel GETs the same URL with pageSize/skip 0', () => {
    service.getAllPurchaseOrderPaymentReportExcel(makeParams()).subscribe();
    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === 'purchaseorderpayment/report');
    expect(req.request.params.get('pageSize')).toBe('0');
    expect(req.request.params.get('skip')).toBe('0');
    req.flush([]);
  });
});
