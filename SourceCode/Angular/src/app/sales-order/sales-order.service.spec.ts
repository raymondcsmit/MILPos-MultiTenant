import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { throwError } from 'rxjs';

import { SalesOrderService } from './sales-order.service';
import { SalesOrderResourceParameter } from '@core/domain-classes/sales-order-resource-parameter';
import { SalesOrderStatusEnum } from '@core/domain-classes/sales-order-status';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { CommonError } from '@core/error-handler/common-error';

describe('SalesOrderService', () => {
  let service: SalesOrderService;
  let httpMock: HttpTestingController;
  let errorHandler: jasmine.SpyObj<CommonHttpErrorService>;

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
    errorHandler = jasmine.createSpyObj<CommonHttpErrorService>('CommonHttpErrorService', ['handleError']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SalesOrderService,
        { provide: CommonHttpErrorService, useValue: errorHandler },
      ],
    });
    service = TestBed.inject(SalesOrderService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  function expectParams(req: any, expected: Record<string, string>) {
    const actual = req.request.params;
    Object.keys(expected).forEach((k) => {
      expect(actual.get(k)).toBe(expected[k]);
    });
  }

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  describe('getAllSalesOrder', () => {
    it('GETs salesOrder with observe response and full params incl dates', () => {
      const p = makeParams({
        fromDate: new Date('2026-01-01T00:00:00Z'),
        toDate: new Date('2026-01-31T00:00:00Z'),
        productId: 'p1',
        customerId: 'c1',
        locationId: 'l1',
        deliveryStatus: 'DELIVERED',
        paymentStatus: 'PAID',
        orderNumber: 'SO-1',
        customerName: 'Acme',
      });

      let result: any;
      const body = [{ id: 'o1' }];
      service.getAllSalesOrder(p).subscribe((r) => (result = r));
      const req = expectUrl('GET', 'salesOrder');
      expectParams(req, {
        pageSize: '25',
        skip: '0',
        orderNumber: 'SO-1',
        customerName: 'Acme',
        fromDate: '2026-01-01T00:00:00.000Z',
        toDate: '2026-01-31T00:00:00.000Z',
        productId: 'p1',
        customerId: 'c1',
        locationId: 'l1',
        deliveryStatus: 'DELIVERED',
        paymentStatus: 'PAID',
      });
      req.flush(body);
      expect(result.body).toEqual(body);
    });

    it('passes empty strings for unset optionals', () => {
      service.getAllSalesOrder(makeParams()).subscribe();
      const req = expectUrl('GET', 'salesOrder');
      expectParams(req, { fromDate: '', toDate: '', productId: '', deliveryStatus: '', paymentStatus: '' });
      req.flush([]);
    });
  });

  describe('getSaleOrderForReturnByCustomerId', () => {
    it('GETs salesOrder/returns', () => {
      service.getSaleOrderForReturnByCustomerId(makeParams()).subscribe();
      const req = expectUrl('GET', 'salesOrder/returns');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });
  });

  describe('getAllSalesOrderExcel', () => {
    it('GETs salesOrder with pageSize 0 and All status', () => {
      service.getAllSalesOrderExcel(makeParams()).subscribe();
      const req = expectUrl('GET', 'salesOrder');
      expectParams(req, { pageSize: '0', skip: '0', status: SalesOrderStatusEnum.All.toString() });
      req.flush([]);
    });
  });

  describe('CRUD writes', () => {
    it('addSalesOrder POSTs to salesOrder', () => {
      const so = { id: 'o1', orderNumber: 'SO-1' } as any;
      let result: any;
      service.addSalesOrder(so).subscribe((r) => (result = r));
      const req = expectUrl('POST', 'salesOrder');
      expect(req.request.body).toBe(so);
      req.flush(so);
      expect(result).toEqual(so);
    });

    it('updateSalesOrder PUTs to salesOrder/{id}', () => {
      const so = { id: 'o1', orderNumber: 'SO-1' } as any;
      service.updateSalesOrder(so).subscribe();
      const req = expectUrl('PUT', 'salesOrder/o1');
      expect(req.request.method).toBe('PUT');
      req.flush(so);
    });

    it('updateSalesOrderReturn PUTs to salesOrder/{id}/return', () => {
      const so = { id: 'o1' } as any;
      service.updateSalesOrderReturn(so).subscribe();
      const req = expectUrl('PUT', 'salesOrder/o1/return');
      expect(req.request.method).toBe('PUT');
      req.flush(so);
    });

    it('markasdelivered PUTs to salesOrder/{id}/markasdelivered with empty body', () => {
      service.markasdelivered('o9').subscribe();
      const req = expectUrl('PUT', 'salesOrder/o9/markasdelivered');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({});
      req.flush({} as any);
    });

    it('deleteSalesOrder DELETEs salesOrder/{id}', () => {
      service.deleteSalesOrder('o1').subscribe();
      const req = expectUrl('DELETE', 'salesOrder/o1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('number + lookup', () => {
    it('getNewSalesOrderNumber GETs salesOrder/newOrderNumber/{flag}', () => {
      service.getNewSalesOrderNumber(true).subscribe();
      const req = expectUrl('GET', 'salesOrder/newOrderNumber/true');
      expect(req.request.method).toBe('GET');
      req.flush({ id: 'n' } as any);
    });

    it('getNewSalesOrderRequestNumber GETs salesOrder-request/newOrderNumber', () => {
      service.getNewSalesOrderRequestNumber().subscribe();
      expectUrl('GET', 'salesOrder-request/newOrderNumber').flush({} as any);
    });

    it('getSalesOrderById GETs salesOrder/{id}', () => {
      service.getSalesOrderById('o1').subscribe();
      expectUrl('GET', 'salesOrder/o1').flush({} as any);
    });

    it('getSalesOrderByIdReturnItems GETs salesOrder/{id}/returnItems', () => {
      service.getSalesOrderByIdReturnItems('o1').subscribe();
      expectUrl('GET', 'salesOrder/o1/returnItems').flush([]);
    });

    it('getSalesOrderItems GETs salesOrder/{id}/items?isReturn=...', () => {
      service.getSalesOrderItems('o1', true).subscribe();
      const req = httpMock.expectOne('salesOrder/o1/items?isReturn=true');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('downloadAttachment GETs blob events', () => {
      service.downloadAttachment('a1').subscribe();
      const req = expectUrl('GET', 'salesOrderAttachment/a1/download');
      expect(req.request.responseType).toBe('blob');
      req.flush(new Blob());
    });
  });

  describe('report + tax + total', () => {
    it('getSalesOrderItemReport GETs salesOrder/items/reports', () => {
      service.getSalesOrderItemReport(makeParams()).subscribe();
      const req = expectUrl('GET', 'salesOrder/items/reports');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('getSalesOrderTaxItems GETs salesOrder/{id}/tax-item', () => {
      service.getSalesOrderTaxItems('o1').subscribe();
      const req = expectUrl('GET', 'salesOrder/o1/tax-item');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('getSalesOrderTotal GETs salesOrder/total', () => {
      service.getSalesOrderTotal(makeParams()).subscribe();
      const req = expectUrl('GET', 'salesOrder/total');
      expect(req.request.method).toBe('GET');
      req.flush({ totalSale: 100 } as any);
    });

    it('getTotalByTaxForSalesOrder GETs salesOrder/tax-item-total', () => {
      service.getTotalByTaxForSalesOrder(makeParams()).subscribe();
      const req = expectUrl('GET', 'salesOrder/tax-item-total');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });
  });

  describe('error propagation', () => {
    it('propagates CommonError from updateSalesOrder', () => {
      errorHandler.handleError.and.callFake((err: HttpErrorResponse) =>
        throwError(() => ({ statusText: err.statusText, code: err.status } as CommonError))
      );
      let error: any;
      service.updateSalesOrder({ id: 'o1' } as any).subscribe({ error: (e) => (error = e) });
      expectUrl('PUT', 'salesOrder/o1').flush({ messages: ['nope'] }, { status: 422, statusText: 'Unprocessable Entity' });
      expect(error.code).toBe(422);
      expect(errorHandler.handleError).toHaveBeenCalled();
    });
  });
});
