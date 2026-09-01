import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { ProfitLossReportService } from './profit-loss-report.service';
import { SalesOrderResourceParameter } from '@core/domain-classes/sales-order-resource-parameter';

describe('ProfitLossReportService', () => {
  let service: ProfitLossReportService;
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
      providers: [provideHttpClient(), provideHttpClientTesting(), ProfitLossReportService],
    });
    service = TestBed.inject(ProfitLossReportService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getSaleOrderProfitLoss GETs salesOrder/items/profitLoss with date params', () => {
    let result: any;
    service
      .getSaleOrderProfitLoss(
        makeParams({ fromDate: new Date('2026-01-01T00:00:00Z'), toDate: new Date('2026-01-31T00:00:00Z'), locationId: 'l1' })
      )
      .subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === 'salesOrder/items/profitLoss');
    expect(req.request.params.get('fromDate')).toBe('2026-01-01T00:00:00.000Z');
    expect(req.request.params.get('toDate')).toBe('2026-01-31T00:00:00.000Z');
    expect(req.request.params.get('locationId')).toBe('l1');
    const body = { totalSales: 100, totalProfit: 10 };
    req.flush(body);
    expect(result).toEqual(body);
  });

  it('getSaleOrderProfitLoss defaults missing dates/location to empty strings', () => {
    service.getSaleOrderProfitLoss(makeParams()).subscribe();
    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === 'salesOrder/items/profitLoss');
    expect(req.request.params.get('fromDate')).toBe('');
    expect(req.request.params.get('toDate')).toBe('');
    expect(req.request.params.get('locationId')).toBe('');
    req.flush({});
  });

  it('getPurchaseProfitLoss GETs purchaseOrder/items/profitLoss with date params', () => {
    let result: any;
    service
      .getPurchaseProfitLoss(
        makeParams({ fromDate: new Date('2026-02-01T00:00:00Z'), toDate: new Date('2026-02-28T00:00:00Z'), locationId: 'l2' })
      )
      .subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === 'purchaseOrder/items/profitLoss');
    expect(req.request.params.get('fromDate')).toBe('2026-02-01T00:00:00.000Z');
    expect(req.request.params.get('toDate')).toBe('2026-02-28T00:00:00.000Z');
    expect(req.request.params.get('locationId')).toBe('l2');
    req.flush({});
  });
});
