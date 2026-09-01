import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';

import { LedgerAccountService } from './ledger-account.service';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { CommonError } from '@core/error-handler/common-error';

describe('LedgerAccountService', () => {
  let service: LedgerAccountService;
  let httpMock: HttpTestingController;
  let errorHandler: jasmine.SpyObj<CommonHttpErrorService>;

  beforeEach(() => {
    errorHandler = jasmine.createSpyObj<CommonHttpErrorService>('CommonHttpErrorService', ['handleError']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        LedgerAccountService,
        { provide: CommonHttpErrorService, useValue: errorHandler },
      ],
    });
    service = TestBed.inject(LedgerAccountService);
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

  it('getAllLedgerAccount GETs LedgerAccount/{locationId}', () => {
    const body = [{ id: 'la1', name: 'Cash' }];
    let result: any;
    service.getAllLedgerAccount('l1').subscribe((r) => (result = r));
    const req = expectUrl('GET', 'LedgerAccount/l1');
    expect(req.request.method).toBe('GET');
    req.flush(body);
    expect(result).toEqual(body);
  });

  it('getAllLedgerAccountGroupBy GETs LedgerAccount/{locationId}/groupby/accountType', () => {
    const body = [{ accountType: 'Asset', accounts: [] }];
    let result: any;
    service.getAllLedgerAccountGroupBy('l1').subscribe((r) => (result = r));
    const req = expectUrl('GET', 'LedgerAccount/l1/groupby/accountType');
    expect(req.request.method).toBe('GET');
    req.flush(body);
    expect(result).toEqual(body);
  });

  it('getLedgerAccounts GETs LedgerAccount/dropdown', () => {
    const body = [{ id: 'la1', name: 'Cash' }];
    let result: any;
    service.getLedgerAccounts().subscribe((r) => (result = r));
    const req = expectUrl('GET', 'LedgerAccount/dropdown');
    expect(req.request.method).toBe('GET');
    req.flush(body);
    expect(result).toEqual(body);
  });

  it('addLedgerAccount POSTs LedgerAccount with the body', () => {
    const account = { id: 'la1', name: 'Cash' } as any;
    let result: any;
    service.addLedgerAccount(account).subscribe((r) => (result = r));
    const req = expectUrl('POST', 'LedgerAccount');
    expect(req.request.body).toBe(account);
    req.flush(account);
    expect(result).toEqual(account);
  });

  it('updateLedgerAccount PUTs LedgerAccount/{id} with the body', () => {
    const account = { id: 'la1', name: 'Cash' } as any;
    service.updateLedgerAccount(account).subscribe();
    const req = expectUrl('PUT', 'LedgerAccount/la1');
    expect(req.request.body).toBe(account);
    req.flush(account);
  });

  it('propagates CommonError from addLedgerAccount', () => {
    errorHandler.handleError.and.callFake((err: HttpErrorResponse) =>
      throwError(() => ({ statusText: err.statusText, code: err.status } as CommonError))
    );
    let error: any;
    service.addLedgerAccount({ id: 'la1' } as any).subscribe({ error: (e) => (error = e) });
    expectUrl('POST', 'LedgerAccount').flush({ messages: ['nope'] }, { status: 422, statusText: 'Unprocessable Entity' });
    expect(error.code).toBe(422);
    expect(errorHandler.handleError).toHaveBeenCalled();
  });
});
