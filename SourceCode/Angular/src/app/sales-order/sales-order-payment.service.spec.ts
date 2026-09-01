import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';

import { SalesOrderPaymentService } from './sales-order-payment.service';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { CommonError } from '@core/error-handler/common-error';
import { paymentMethods } from '@core/domain-classes/payment-method';

describe('SalesOrderPaymentService', () => {
  let service: SalesOrderPaymentService;
  let httpMock: HttpTestingController;
  let errorHandler: jasmine.SpyObj<CommonHttpErrorService>;

  beforeEach(() => {
    errorHandler = jasmine.createSpyObj<CommonHttpErrorService>('CommonHttpErrorService', ['handleError']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SalesOrderPaymentService,
        { provide: CommonHttpErrorService, useValue: errorHandler },
      ],
    });
    service = TestBed.inject(SalesOrderPaymentService);
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

  it('getAllSalesOrderPaymentById GETs SalesOrderPayment/{id}', () => {
    const body = [{ id: 'pay1' }];
    let result: any;
    service.getAllSalesOrderPaymentById('so1').subscribe((r) => (result = r));
    const req = expectUrl('GET', 'SalesOrderPayment/so1');
    expect(req.request.method).toBe('GET');
    req.flush(body);
    expect(result).toEqual(body);
  });

  it('addSalesOrderPayments POSTs SalesOrderPayment with the body', () => {
    const payment = { id: 'pay1', amount: 100 } as any;
    let result: any;
    service.addSalesOrderPayments(payment).subscribe((r) => (result = r));
    const req = expectUrl('POST', 'SalesOrderPayment');
    expect(req.request.body).toBe(payment);
    req.flush(payment);
    expect(result).toEqual(payment);
  });

  it('getPaymentMethod emits the local paymentMethods list without HTTP', () => {
    let result: any;
    service.getPaymentMethod().subscribe((r) => (result = r));
    expect(result).toEqual(paymentMethods);
  });

  it('deleteSalesOrderPayment DELETEs SalesOrderPayment/{id}', () => {
    service.deleteSalesOrderPayment('pay1').subscribe();
    const req = expectUrl('DELETE', 'SalesOrderPayment/pay1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('propagates CommonError from addSalesOrderPayments', () => {
    errorHandler.handleError.and.callFake((err: HttpErrorResponse) =>
      throwError(() => ({ statusText: err.statusText, code: err.status } as CommonError))
    );
    let error: any;
    service.addSalesOrderPayments({ id: 'pay1' } as any).subscribe({ error: (e) => (error = e) });
    expectUrl('POST', 'SalesOrderPayment').flush({ messages: ['nope'] }, { status: 422, statusText: 'Unprocessable Entity' });
    expect(error.code).toBe(422);
    expect(errorHandler.handleError).toHaveBeenCalled();
  });
});
