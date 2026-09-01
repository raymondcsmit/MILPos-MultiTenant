import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';

import { PurchaseOrderPaymentService } from './purchase-order-payment.service';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { CommonError } from '@core/error-handler/common-error';
import { paymentMethods } from '@core/domain-classes/payment-method';

describe('PurchaseOrderPaymentService', () => {
  let service: PurchaseOrderPaymentService;
  let httpMock: HttpTestingController;
  let errorHandler: jasmine.SpyObj<CommonHttpErrorService>;

  beforeEach(() => {
    errorHandler = jasmine.createSpyObj<CommonHttpErrorService>('CommonHttpErrorService', ['handleError']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PurchaseOrderPaymentService,
        { provide: CommonHttpErrorService, useValue: errorHandler },
      ],
    });
    service = TestBed.inject(PurchaseOrderPaymentService);
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

  it('getAllPurchaseOrderPaymentById GETs PurchaseOrderPayment/{id}', () => {
    const body = [{ id: 'pay1' }];
    let result: any;
    service.getAllPurchaseOrderPaymentById('po1').subscribe((r) => (result = r));
    const req = expectUrl('GET', 'PurchaseOrderPayment/po1');
    expect(req.request.method).toBe('GET');
    req.flush(body);
    expect(result).toEqual(body);
  });

  it('addPurchaseOrderPayments POSTs PurchaseOrderPayment with the body', () => {
    const payment = { id: 'pay1', amount: 100 } as any;
    let result: any;
    service.addPurchaseOrderPayments(payment).subscribe((r) => (result = r));
    const req = expectUrl('POST', 'PurchaseOrderPayment');
    expect(req.request.body).toBe(payment);
    req.flush(payment);
    expect(result).toEqual(payment);
  });

  it('getPaymentMethod emits the local paymentMethods list without HTTP', () => {
    let result: any;
    service.getPaymentMethod().subscribe((r) => (result = r));
    expect(result).toEqual(paymentMethods);
  });

  it('deletePurchaseOrderPayment DELETEs PurchaseOrderPayment/{id}', () => {
    service.deletePurchaseOrderPayment('pay1').subscribe();
    const req = expectUrl('DELETE', 'PurchaseOrderPayment/pay1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('propagates CommonError from addPurchaseOrderPayments', () => {
    errorHandler.handleError.and.callFake((err: HttpErrorResponse) =>
      throwError(() => ({ statusText: err.statusText, code: err.status } as CommonError))
    );
    let error: any;
    service.addPurchaseOrderPayments({ id: 'pay1' } as any).subscribe({ error: (e) => (error = e) });
    expectUrl('POST', 'PurchaseOrderPayment').flush({ messages: ['nope'] }, { status: 422, statusText: 'Unprocessable Entity' });
    expect(error.code).toBe(422);
    expect(errorHandler.handleError).toHaveBeenCalled();
  });
});
