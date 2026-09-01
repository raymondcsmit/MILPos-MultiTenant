import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { SalesPurchaseReportService } from './sales-purchase-report.service';

describe('SalesPurchaseReportService', () => {
  let service: SalesPurchaseReportService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), SalesPurchaseReportService],
    });
    service = TestBed.inject(SalesPurchaseReportService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getSalesVsPurchaseReport GETs dashboard/salesvspurchase with ISO fromDate, toDateString toDate and locationId', () => {
    const fromDate = new Date('2026-01-01T10:00:00Z');
    const toDate = new Date('2026-01-31T10:00:00Z');
    let result: any;
    service.getSalesVsPurchaseReport(fromDate, toDate, 'l1').subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === 'dashboard/salesvspurchase');
    expect(req.request.params.get('fromDate')).toBe(fromDate.toISOString());
    expect(req.request.params.get('toDate')).toBe(toDate.toDateString());
    expect(req.request.params.get('locationId')).toBe('l1');
    const body = [{ id: 's1' }];
    req.flush(body);
    expect(result).toEqual(body);
  });

  it('getSalesVsPurchaseReport defaults locationId to empty string', () => {
    service.getSalesVsPurchaseReport(new Date(), new Date()).subscribe();
    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === 'dashboard/salesvspurchase');
    expect(req.request.params.get('locationId')).toBe('');
    req.flush([]);
  });
});
