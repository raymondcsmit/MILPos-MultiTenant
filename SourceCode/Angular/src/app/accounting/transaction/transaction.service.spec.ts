import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { TransactionService } from './transaction.service';
import { TransactionResourceParameter } from './transaction-list/transaction-resource-parameter';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';

describe('TransactionService', () => {
  let service: TransactionService;
  let httpMock: HttpTestingController;
  let errorHandler: jasmine.SpyObj<CommonHttpErrorService>;

  function makeParams(overrides: Partial<TransactionResourceParameter> = {}): TransactionResourceParameter {
    const p = new TransactionResourceParameter();
    p.fields = '';
    p.orderBy = 'transactionNumber asc';
    p.pageSize = 25;
    p.skip = 0;
    p.searchQuery = '';
    p.name = '';
    Object.assign(p, overrides);
    return p;
  }

  beforeEach(() => {
    errorHandler = jasmine.createSpyObj<CommonHttpErrorService>('CommonHttpErrorService', ['handleError']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TransactionService,
        { provide: CommonHttpErrorService, useValue: errorHandler },
      ],
    });
    service = TestBed.inject(TransactionService);
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

  describe('getAllTransaction', () => {
    it('GETs transaction with observe response and full params incl dates', () => {
      const body = [{ id: 't1' }];
      let result: any;
      service
        .getAllTransaction(
          makeParams({
            fromDate: new Date('2026-01-01T00:00:00Z'),
            toDate: new Date('2026-01-31T00:00:00Z'),
            transactionNumber: 'TR-1',
            referenceNumber: 'REF-1',
            paymentStatus: 'PAID',
            status: 'Posted',
            transactionType: 'Journal',
            branchId: 'l1',
          })
        )
        .subscribe((r) => (result = r));
      const req = expectUrl('GET', 'transaction');
      expect(req.request.params.get('fields')).toBe('');
      expect(req.request.params.get('orderBy')).toBe('transactionNumber asc');
      expect(req.request.params.get('pageSize')).toBe('25');
      expect(req.request.params.get('skip')).toBe('0');
      expect(req.request.params.get('searchQuery')).toBe('');
      expect(req.request.params.get('name')).toBe('');
      expect(req.request.params.get('transactionNumber')).toBe('TR-1');
      expect(req.request.params.get('referenceNumber')).toBe('REF-1');
      expect(req.request.params.get('paymentStatus')).toBe('PAID');
      expect(req.request.params.get('status')).toBe('Posted');
      expect(req.request.params.get('transactionType')).toBe('Journal');
      expect(req.request.params.get('branchId')).toBe('l1');
      expect(req.request.params.get('fromDate')).toBe('2026-01-01T00:00:00.000Z');
      expect(req.request.params.get('toDate')).toBe('2026-01-31T00:00:00.000Z');
      req.flush(body);
      expect(result.body).toEqual(body);
    });

    it('passes empty strings for null dates and statuses', () => {
      service.getAllTransaction(makeParams()).subscribe();
      const req = expectUrl('GET', 'transaction');
      expect(req.request.params.get('fromDate')).toBe('');
      expect(req.request.params.get('toDate')).toBe('');
      expect(req.request.params.get('paymentStatus')).toBe('');
      expect(req.request.params.get('status')).toBe('');
      expect(req.request.params.get('transactionType')).toBe('');
      expect(req.request.params.get('transactionNumber')).toBe('');
      expect(req.request.params.get('referenceNumber')).toBe('');
      expect(req.request.params.get('branchId')).toBe('');
      req.flush([]);
    });
  });

  describe('getTransactionItems', () => {
    it('GETs TransactionItem/{id}', () => {
      const body = [{ id: 'i1' }];
      let result: any;
      service.getTransactionItems('t1').subscribe((r) => (result = r));
      const req = expectUrl('GET', 'TransactionItem/t1');
      expect(req.request.method).toBe('GET');
      req.flush(body);
      expect(result).toEqual(body);
    });
  });
});
