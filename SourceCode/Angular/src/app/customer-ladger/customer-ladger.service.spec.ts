import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';

import { CustomerLadgerService } from './customer-ladger.service';
import { CustomerLadgerResourceParameter } from './customer-ladger-list/customer-ladger-resource-parameter';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { CommonError } from '@core/error-handler/common-error';

describe('CustomerLadgerService', () => {
  let service: CustomerLadgerService;
  let httpMock: HttpTestingController;
  let errorHandler: jasmine.SpyObj<CommonHttpErrorService>;

  function makeParams(overrides: Partial<CustomerLadgerResourceParameter> = {}): CustomerLadgerResourceParameter {
    const p = new CustomerLadgerResourceParameter();
    p.fields = '';
    p.orderBy = 'accountDate desc';
    p.pageSize = 25;
    p.skip = 0;
    p.searchQuery = '';
    p.name = '';
    p.reference = '';
    p.locationId = '';
    p.accountId = '';
    Object.assign(p, overrides);
    return p;
  }

  beforeEach(() => {
    errorHandler = jasmine.createSpyObj<CommonHttpErrorService>('CommonHttpErrorService', ['handleError']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CustomerLadgerService,
        { provide: CommonHttpErrorService, useValue: errorHandler },
      ],
    });
    service = TestBed.inject(CustomerLadgerService);
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

  describe('getCustomerLadgers', () => {
    it('GETs CustomerLedger with observe response and full params incl date', () => {
      const body = [{ id: 'l1' }];
      let result: any;
      service
        .getCustomerLadgers(
          makeParams({ locationId: 'loc1', accountId: 'a1', reference: 'REF-1', accountDate: new Date('2026-01-15T00:00:00Z') })
        )
        .subscribe((r) => (result = r));
      const req = expectUrl('GET', 'CustomerLedger');
      const params = req.request.params;
      expect(params.get('fields')).toBe('');
      expect(params.get('orderBy')).toBe('accountDate desc');
      expect(params.get('pageSize')).toBe('25');
      expect(params.get('skip')).toBe('0');
      expect(params.get('searchQuery')).toBe('');
      expect(params.get('locationId')).toBe('loc1');
      expect(params.get('accountId')).toBe('a1');
      expect(params.get('reference')).toBe('REF-1');
      expect(params.get('date')).toBe('2026-01-15T00:00:00.000Z');
      req.flush(body);
      expect(result.body).toEqual(body);
    });

    it('passes empty strings for unset location/account/reference/date', () => {
      service.getCustomerLadgers(makeParams()).subscribe();
      const req = expectUrl('GET', 'CustomerLedger');
      const params = req.request.params;
      expect(params.get('locationId')).toBe('');
      expect(params.get('accountId')).toBe('');
      expect(params.get('reference')).toBe('');
      expect(params.get('date')).toBe('');
      req.flush([]);
    });
  });

  describe('addCustomerLadgerHistory', () => {
    it('POSTs CustomerLedger with the body', () => {
      const history = { accountId: 'a1', amount: 100 } as any;
      let result: any;
      service.addCustomerLadgerHistory(history).subscribe((r) => (result = r));
      const req = expectUrl('POST', 'CustomerLedger');
      expect(req.request.body).toBe(history);
      req.flush(history);
      expect(result).toEqual(history);
    });

    it('propagates CommonError through handleError', () => {
      errorHandler.handleError.and.callFake((err: HttpErrorResponse) =>
        throwError(() => ({ statusText: err.statusText, code: err.status } as CommonError))
      );
      let error: any;
      service.addCustomerLadgerHistory({ accountId: 'a1' } as any).subscribe({ error: (e) => (error = e) });
      expectUrl('POST', 'CustomerLedger').flush({ messages: ['nope'] }, { status: 422, statusText: 'Unprocessable Entity' });
      expect(error.code).toBe(422);
      expect(errorHandler.handleError).toHaveBeenCalled();
    });
  });

  describe('getSalesOrderOverdueByAccountId', () => {
    it('GETs CustomerLedger/{accountId}/overdue', () => {
      const overdue = { totalOverdue: 500 } as any;
      let result: any;
      service.getSalesOrderOverdueByAccountId('a1').subscribe((r) => (result = r));
      const req = expectUrl('GET', 'CustomerLedger/a1/overdue');
      expect(req.request.method).toBe('GET');
      req.flush(overdue);
      expect(result).toEqual(overdue);
    });
  });

  describe('getAccountsForDropDown', () => {
    it('GETs CustomerLedger/customerLedger with baked params and trimmed search', () => {
      const body = [{ id: 'a1', name: 'Cash' }];
      let result: any;
      service.getAccountsForDropDown(' Cash ', 'a1').subscribe((r) => (result = r));
      const req = httpMock.expectOne('CustomerLedger/customerLedger?searchQuery=Cash&pageSize=10&id=a1');
      expect(req.request.method).toBe('GET');
      req.flush(body);
      expect(result).toEqual(body);
    });

    it('uses empty searchQuery when no search', () => {
      service.getAccountsForDropDown('').subscribe();
      const req = httpMock.expectOne('CustomerLedger/customerLedger?searchQuery=&pageSize=10&id=');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });
  });
});
