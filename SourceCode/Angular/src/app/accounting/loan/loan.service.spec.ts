import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';

import { LoanService } from './loan.service';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { CommonError } from '@core/error-handler/common-error';

describe('LoanService', () => {
  let service: LoanService;
  let httpMock: HttpTestingController;
  let errorHandler: jasmine.SpyObj<CommonHttpErrorService>;

  beforeEach(() => {
    errorHandler = jasmine.createSpyObj<CommonHttpErrorService>('CommonHttpErrorService', ['handleError']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        LoanService,
        { provide: CommonHttpErrorService, useValue: errorHandler },
      ],
    });
    service = TestBed.inject(LoanService);
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

  it('getAllLoans GETs Loan', () => {
    const body = [{ id: 'ln1', amount: 5000 }];
    let result: any;
    service.getAllLoans().subscribe((r) => (result = r));
    const req = expectUrl('GET', 'Loan');
    expect(req.request.method).toBe('GET');
    req.flush(body);
    expect(result).toEqual(body);
  });

  it('getLoanPaymentsById GETs Loan/{id}', () => {
    const body = [{ id: 'lp1', amount: 500 }];
    let result: any;
    service.getLoanPaymentsById('ln1').subscribe((r) => (result = r));
    const req = expectUrl('GET', 'Loan/ln1');
    expect(req.request.method).toBe('GET');
    req.flush(body);
    expect(result).toEqual(body);
  });

  it('addLoan POSTs Loan with the body', () => {
    const loan = { id: 'ln1', amount: 5000 } as any;
    let result: any;
    service.addLoan(loan).subscribe((r) => (result = r));
    const req = expectUrl('POST', 'Loan');
    expect(req.request.body).toBe(loan);
    req.flush(loan);
    expect(result).toEqual(loan);
  });

  it('addLoanPayment POSTs Loan/Repayment with the body', () => {
    const payment = { id: 'lp1', amount: 500 } as any;
    let result: any;
    service.addLoanPayment(payment).subscribe((r) => (result = r));
    const req = expectUrl('POST', 'Loan/Repayment');
    expect(req.request.body).toBe(payment);
    req.flush(payment);
    expect(result).toEqual(payment);
  });

  it('propagates CommonError from getAllLoans', () => {
    errorHandler.handleError.and.callFake((err: HttpErrorResponse) =>
      throwError(() => ({ statusText: err.statusText, code: err.status } as CommonError))
    );
    let error: any;
    service.getAllLoans().subscribe({ error: (e) => (error = e) });
    expectUrl('GET', 'Loan').flush({ messages: ['nope'] }, { status: 500, statusText: 'Internal Server Error' });
    expect(error.code).toBe(500);
    expect(errorHandler.handleError).toHaveBeenCalled();
  });
});
