import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { throwError } from 'rxjs';

import { DashboardService } from './dashboard.service';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { CommonError } from '@core/error-handler/common-error';
import { ProductResourceParameter } from '@core/domain-classes/product-resource-parameter';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;
  let errorHandler: jasmine.SpyObj<CommonHttpErrorService>;

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  function makeProductParams(): ProductResourceParameter {
    const p = new ProductResourceParameter();
    p.orderBy = 'name asc';
    p.pageSize = 25;
    p.skip = 0;
    p.searchQuery = '';
    p.name = '';
    return p;
  }

  beforeEach(() => {
    errorHandler = jasmine.createSpyObj<CommonHttpErrorService>('CommonHttpErrorService', ['handleError']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        DashboardService,
        { provide: CommonHttpErrorService, useValue: errorHandler },
      ],
    });
    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getDashboardStaticatics GETs dashboard/statistics with ISO dates and location', () => {
    const from = new Date('2026-01-01T00:00:00Z');
    const to = new Date('2026-01-31T00:00:00Z');
    service.getDashboardStaticatics(from, to, 'l1').subscribe();
    const req = expectUrl('GET', 'dashboard/statistics');
    expect(req.request.params.get('fromDate')).toBe(from.toISOString());
    expect(req.request.params.get('toDate')).toBe(to.toISOString());
    expect(req.request.params.get('locationId')).toBe('l1');
    req.flush({ totalSales: 1 } as any);
  });

  it('getBestSellingProducts GETs dashboard/bestsellingproduct with params', () => {
    service.getBestSellingProducts(new Date('2026-01-01T00:00:00Z'), new Date('2026-01-31T00:00:00Z'), 'l1').subscribe();
    const req = expectUrl('GET', 'dashboard/bestsellingproduct');
    expect(req.request.params.get('locationId')).toBe('l1');
    req.flush([]);
  });

  it('getPurchaseOrderRecentDeliverySchedule GETs purchaseOrder/recentdelivery', () => {
    service.getPurchaseOrderRecentDeliverySchedule().subscribe();
    expectUrl('GET', 'purchaseOrder/recentdelivery').flush([]);
  });

  it('getSalesOrderRecentShipment GETs salesOrder/recentshipment', () => {
    service.getSalesOrderRecentShipment().subscribe();
    expectUrl('GET', 'salesOrder/recentshipment').flush([]);
  });

  it('getProductStockAlerts GETs ProductStock/stock-alert observe response', () => {
    service.getProductStockAlerts(makeProductParams()).subscribe();
    const req = expectUrl('GET', 'ProductStock/stock-alert');
    expect(req.request.params.get('pageSize')).toBe('25');
    expect(req.request.params.get('locationId')).toBe('');
    req.flush([]);
  });

  [
    ['getDailyReminders', 'dashboard/dailyreminder'],
    ['getWeeklyReminders', 'dashboard/weeklyreminder'],
    ['getMonthlyReminders', 'dashboard/monthlyreminder'],
    ['getQuarterlyReminders', 'dashboard/quarterlyreminder'],
    ['getHalfYearlyReminders', 'dashboard/halfyearlyreminder'],
    ['getYearlyReminders', 'dashboard/yearlyreminder'],
  ].forEach(([method, url]) => {
    it(`${method} GETs ${url}/{month}/{year}`, () => {
      (service as any)[method](12, 2026).subscribe();
      expectUrl('GET', `${url}/12/2026`).flush([]);
    });
  });

  it('getReminders GETs dashboard/reminders/{month}/{year}', () => {
    service.getReminders(12, 2026).subscribe();
    expectUrl('GET', 'dashboard/reminders/12/2026').flush([]);
  });

  it('getOneTimeReminders GETs Dashboard/onetime/{month}/{year}', () => {
    service.getOneTimeReminders(12, 2026).subscribe();
    expectUrl('GET', 'Dashboard/onetime/12/2026').flush([]);
  });

  it('getProductSalesComparison GETs dashboard/product-sales-comparison with locationId when provided', () => {
    service.getProductSalesComparison('l1').subscribe();
    const req = expectUrl('GET', 'dashboard/product-sales-comparison');
    expect(req.request.params.get('locationId')).toBe('l1');
    req.flush([]);
  });

  it('getProductSalesComparison omits locationId when not provided', () => {
    service.getProductSalesComparison().subscribe();
    const req = expectUrl('GET', 'dashboard/product-sales-comparison');
    expect(req.request.params.has('locationId')).toBe(false);
    req.flush([]);
  });

  it('getIncomeComparison GETs dashboard/income-comparison', () => {
    service.getIncomeComparison('l1').subscribe();
    const req = expectUrl('GET', 'dashboard/income-comparison');
    expect(req.request.params.get('locationId')).toBe('l1');
    req.flush([]);
  });

  it('getSalesComparison GETs dashboard/sales-comparison', () => {
    service.getSalesComparison('l1').subscribe();
    const req = expectUrl('GET', 'dashboard/sales-comparison');
    expect(req.request.params.get('locationId')).toBe('l1');
    req.flush([]);
  });

  it('propagates CommonError from getDailyReminders', () => {
    errorHandler.handleError.and.callFake((err: HttpErrorResponse) =>
      throwError(() => ({ code: err.status } as CommonError))
    );
    let error: any;
    service.getDailyReminders(12, 2026).subscribe({ error: (e) => (error = e) });
    expectUrl('GET', 'dashboard/dailyreminder/12/2026').flush({}, { status: 500, statusText: 'boom' });
    expect(error.code).toBe(500);
  });
});
