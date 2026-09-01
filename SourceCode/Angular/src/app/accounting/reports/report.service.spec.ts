import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { ReportService } from './report.service';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { GeneralEntryResourceParameter } from './general-entry-report/general-entry-resource-parameter';
import { PaymentReportResource } from './payment-report/model/payment-report-resource';

describe('ReportService', () => {
  let service: ReportService;
  let httpMock: HttpTestingController;
  let errorHandler: jasmine.SpyObj<CommonHttpErrorService>;

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  function makeGeneralEntryParams(overrides: Partial<GeneralEntryResourceParameter> = {}): GeneralEntryResourceParameter {
    const p = new GeneralEntryResourceParameter();
    p.fields = '';
    p.orderBy = 'transactionNumber asc';
    p.pageSize = 25;
    p.skip = 0;
    p.searchQuery = '';
    p.name = '';
    Object.assign(p, overrides);
    return p;
  }

  function makePaymentParams(overrides: Partial<PaymentReportResource> = {}): PaymentReportResource {
    return Object.assign(
      {
        orderBy: 'amount asc',
        pageSize: 25,
        skip: 0,
        searchQuery: '',
        name: '',
        fields: '',
        transactionNumber: '',
        amount: null,
        paymentFromDate: null,
        paymentToDate: null,
      },
      overrides
    ) as PaymentReportResource;
  }

  beforeEach(() => {
    errorHandler = jasmine.createSpyObj<CommonHttpErrorService>('CommonHttpErrorService', ['handleError']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ReportService,
        { provide: CommonHttpErrorService, useValue: errorHandler },
      ],
    });
    service = TestBed.inject(ReportService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  const fyReports: [string, string][] = [
    ['getProfitLossReport', 'Reports/ProfitLoss'],
    ['getTaxReport', 'Reports/taxreport'],
    ['getCashBankReport', 'Reports/cashbankreport'],
    ['getBalanceSheetReport', 'Reports/balancesheetreport'],
    ['getAccountBalanceReport', 'Reports/AccountBalancereport'],
  ];

  fyReports.forEach(([method, url]) => {
    it(`${method} GETs ${url} with financialYearId and branchId`, () => {
      (service as any)[method]('fy1', 'l1').subscribe();
      const req = expectUrl('GET', url);
      expect(req.request.params.get('financialYearId')).toBe('fy1');
      expect(req.request.params.get('branchId')).toBe('l1');
      req.flush({});
    });

    it(`${method} defaults branchId to empty when no location`, () => {
      (service as any)[method]('fy1').subscribe();
      const req = expectUrl('GET', url);
      expect(req.request.params.get('branchId')).toBe('');
      req.flush({});
    });
  });

  it('getAllGeneralEntry GETs Reports with observe response', () => {
    const body = [{ id: 'e1' }];
    let result: any;
    service.getAllGeneralEntry(makeGeneralEntryParams({ branchId: 'l1', financialYearId: 'fy1' })).subscribe((r) => (result = r));
    const req = expectUrl('GET', 'Reports');
    expect(req.request.params.get('branchId')).toBe('l1');
    expect(req.request.params.get('financialYearId')).toBe('fy1');
    expect(req.request.params.get('pageSize')).toBe('25');
    req.flush(body);
    expect(result.body).toEqual(body);
  });

  it('getAllGeneralEntry serializes dates to ISO', () => {
    service.getAllGeneralEntry(
      makeGeneralEntryParams({ fromDate: new Date('2026-01-01T00:00:00Z'), toDate: new Date('2026-01-31T00:00:00Z') })
    ).subscribe();
    const req = expectUrl('GET', 'Reports');
    expect(req.request.params.get('fromDate')).toBe('2026-01-01T00:00:00.000Z');
    expect(req.request.params.get('toDate')).toBe('2026-01-31T00:00:00.000Z');
    req.flush([]);
  });

  it('getAllPaymentReports GETs Reports/Paymentreport', () => {
    service.getAllPaymentReports(makePaymentParams({ amount: 50 })).subscribe();
    const req = expectUrl('GET', 'Reports/Paymentreport');
    expect(req.request.params.get('amount')).toBe('50');
    expect(req.request.params.get('pageSize')).toBe('25');
    req.flush([]);
  });

  it('getAllPaymentReports defaults null amount/dates to empty strings', () => {
    service.getAllPaymentReports(makePaymentParams()).subscribe();
    const req = expectUrl('GET', 'Reports/Paymentreport');
    expect(req.request.params.get('amount')).toBe('');
    expect(req.request.params.get('paymentFromDate')).toBe('');
    expect(req.request.params.get('paymentToDate')).toBe('');
    req.flush([]);
  });

  it('getTrialBalanceReport GETs Reports/trialbalancereport with ISO dates', () => {
    service.getTrialBalanceReport(new Date('2026-01-01T00:00:00Z'), new Date('2026-01-31T00:00:00Z'), 'l1').subscribe();
    const req = expectUrl('GET', 'Reports/trialbalancereport');
    expect(req.request.params.get('fromDate')).toBe('2026-01-01T00:00:00.000Z');
    expect(req.request.params.get('toDate')).toBe('2026-01-31T00:00:00.000Z');
    expect(req.request.params.get('locationId')).toBe('l1');
    req.flush({});
  });

  it('getCashFlowReport GETs Reports/cashflowreport', () => {
    service.getCashFlowReport(new Date('2026-01-01T00:00:00Z'), new Date('2026-01-31T00:00:00Z')).subscribe();
    const req = expectUrl('GET', 'Reports/cashflowreport');
    expect(req.request.params.get('locationId')).toBe('');
    req.flush({});
  });

  describe('daily summaries', () => {
    const daily: [string, string][] = [
      ['getDailySalesSummary', 'DailyReport/sale'],
      ['getDailyPurchaseSummary', 'DailyReport/purchase'],
      ['getDailyPaymentSummary', 'DailyReport/payment'],
    ];

    daily.forEach(([method, url]) => {
      it(`${method} GETs ${url} with toDateString and local timezone`, () => {
        const d = new Date('2026-01-15T10:00:00Z');
        (service as any)[method](d).subscribe();
        const req = expectUrl('GET', url);
        expect(req.request.params.get('DailyReportDate')).toBe(d.toDateString());
        expect(req.request.params.get('timeZone')).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
        req.flush({});
      });
    });
  });

  it('addGeneralEntry POSTs GeneralEntry with the body', () => {
    const entry = { id: 'g1', amount: 100 } as any;
    let result: any;
    service.addGeneralEntry(entry).subscribe((r) => (result = r));
    const req = expectUrl('POST', 'GeneralEntry');
    expect(req.request.body).toBe(entry);
    req.flush(entry);
    expect(result).toEqual(entry);
  });
});
