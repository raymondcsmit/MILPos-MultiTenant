import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { throwError } from 'rxjs';

import { PurchaseOrderService } from './purchase-order.service';
import { PurchaseOrderResourceParameter } from '@core/domain-classes/purchase-order-resource-parameter';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { CommonError } from '@core/error-handler/common-error';

describe('PurchaseOrderService', () => {
  let service: PurchaseOrderService;
  let httpMock: HttpTestingController;
  let errorHandler: jasmine.SpyObj<CommonHttpErrorService>;

  function makeParams(overrides: Partial<PurchaseOrderResourceParameter> = {}): PurchaseOrderResourceParameter {
    const p = new PurchaseOrderResourceParameter();
    p.fields = '';
    p.orderBy = 'name asc';
    p.pageSize = 25;
    p.skip = 0;
    p.searchQuery = '';
    p.name = '';
    Object.assign(p, overrides);
    return p;
  }

  function expectParams(req: any, expected: Record<string, string>) {
    const actual = req.request.params;
    Object.keys(expected).forEach((k) => {
      expect(actual.get(k)).toBe(expected[k]);
    });
  }

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  beforeEach(() => {
    errorHandler = jasmine.createSpyObj<CommonHttpErrorService>('CommonHttpErrorService', ['handleError']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PurchaseOrderService,
        { provide: CommonHttpErrorService, useValue: errorHandler },
      ],
    });
    service = TestBed.inject(PurchaseOrderService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAllPurchaseOrder', () => {
    it('GETs purchaseorder with observe response and full params', () => {
      const p = makeParams({
        fromDate: new Date('2026-01-01T00:00:00Z'),
        toDate: new Date('2026-01-31T00:00:00Z'),
        productId: 'p1',
        supplierId: 's1',
        locationId: 'l1',
        deliveryStatus: 'DELIVERED',
        paymentStatus: 'PAID',
        orderNumber: 'PO-1',
        supplierName: 'Acme',
      });
      const body = [{ id: 'o1' }];
      let result: any;
      service.getAllPurchaseOrder(p).subscribe((r) => (result = r));
      const req = expectUrl('GET', 'purchaseorder');
      expectParams(req, {
        pageSize: '25',
        orderNumber: 'PO-1',
        supplierName: 'Acme',
        fromDate: '2026-01-01T00:00:00.000Z',
        toDate: '2026-01-31T00:00:00.000Z',
        productId: 'p1',
        supplierId: 's1',
        locationId: 'l1',
        deliveryStatus: 'DELIVERED',
        paymentStatus: 'PAID',
      });
      req.flush(body);
      expect(result.body).toEqual(body);
    });

    it('passes empty strings for unset optionals', () => {
      service.getAllPurchaseOrder(makeParams()).subscribe();
      const req = expectUrl('GET', 'purchaseorder');
      expectParams(req, { fromDate: '', toDate: '', productId: '', deliveryStatus: '', paymentStatus: '' });
      req.flush([]);
    });
  });

  describe('reports', () => {
    it('getPurchaseOrderItemReport GETs purchaseorder/items/reports', () => {
      service.getPurchaseOrderItemReport(makeParams()).subscribe();
      const req = expectUrl('GET', 'purchaseorder/items/reports');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('getAllPurchaseOrderItemReport GETs purchaseorder/items/reports with 0 pageSize', () => {
      service.getAllPurchaseOrderItemReport(makeParams()).subscribe();
      const req = expectUrl('GET', 'purchaseorder/items/reports');
      expectParams(req, { pageSize: '0', skip: '0' });
      req.flush([]);
    });

    it('getPurchaseOrderByIdReturnItems GETs PurchaseOrder/{id}/returnItems', () => {
      service.getPurchaseOrderByIdReturnItems('o1').subscribe();
      expectUrl('GET', 'PurchaseOrder/o1/returnItems').flush([]);
    });
  });

  describe('CRUD writes', () => {
    it('addPurchaseOrder POSTs to PurchaseOrder', () => {
      const po = { id: 'o1', orderNumber: 'PO-1' } as any;
      let result: any;
      service.addPurchaseOrder(po).subscribe((r) => (result = r));
      const req = expectUrl('POST', 'PurchaseOrder');
      expect(req.request.body).toBe(po);
      req.flush(po);
      expect(result).toEqual(po);
    });

    it('updatePurchaseOrder PUTs to PurchaseOrder/{id}', () => {
      const po = { id: 'o1' } as any;
      service.updatePurchaseOrder(po).subscribe();
      const req = expectUrl('PUT', 'PurchaseOrder/o1');
      expect(req.request.body).toBe(po);
      req.flush(po);
    });

    it('markAsReceived PUTs to PurchaseOrder/{id}/markasreceived', () => {
      service.markAsReceived('o1').subscribe();
      const req = expectUrl('PUT', 'PurchaseOrder/o1/markasreceived');
      expect(req.request.body).toEqual({});
      req.flush({} as any);
    });

    it('updatePurchaseOrderReturn PUTs to PurchaseOrder/{id}/return', () => {
      const po = { id: 'o1' } as any;
      service.updatePurchaseOrderReturn(po).subscribe();
      const req = expectUrl('PUT', 'PurchaseOrder/o1/return');
      expect(req.request.method).toBe('PUT');
      req.flush(po);
    });

    it('deletePurchaseOrder DELETEs PurchaseOrder/{id}', () => {
      service.deletePurchaseOrder('o1').subscribe();
      const req = expectUrl('DELETE', 'PurchaseOrder/o1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('number + lookup', () => {
    it('getNewPurchaseOrderNumber GETs purchaseorder/newOrderNumber/{flag}', () => {
      service.getNewPurchaseOrderNumber(true).subscribe();
      const req = expectUrl('GET', 'purchaseorder/newOrderNumber/true');
      expect(req.request.method).toBe('GET');
      req.flush({ id: 'n' } as any);
    });

    it('getPurchaseOrderById GETs purchaseorder/{id}', () => {
      service.getPurchaseOrderById('o1').subscribe();
      expectUrl('GET', 'purchaseorder/o1').flush({} as any);
    });

    it('getPurchaseOrderItems GETs purchaseorder/{id}/items?isReturn=...', () => {
      service.getPurchaseOrderItems('o1', true).subscribe();
      const req = httpMock.expectOne('purchaseorder/o1/items?isReturn=true');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('getPurchaseOrderTaxItems GETs purchaseorder/{id}/tax-item', () => {
      service.getPurchaseOrderTaxItems('o1').subscribe();
      expectUrl('GET', 'purchaseorder/o1/tax-item').flush([]);
    });

    it('downloadAttachment GETs blob events', () => {
      service.downloadAttachment('a1').subscribe();
      const req = expectUrl('GET', 'PurchaseOrderAttachment/a1/download');
      expect(req.request.responseType).toBe('blob');
      req.flush(new Blob());
    });
  });

  describe('total', () => {
    it('getPurchaseOrderTotal GETs purchaseorder/total', () => {
      service.getPurchaseOrderTotal(makeParams()).subscribe();
      const req = expectUrl('GET', 'purchaseorder/total');
      expect(req.request.method).toBe('GET');
      req.flush({ totalPurchase: 200 } as any);
    });

    it('getTotalByTaxForPurchaseOrder GETs purchaseorder/tax-item-total', () => {
      service.getTotalByTaxForPurchaseOrder(makeParams()).subscribe();
      const req = expectUrl('GET', 'purchaseorder/tax-item-total');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });
  });

  describe('error propagation', () => {
    it('propagates CommonError from updatePurchaseOrder', () => {
      errorHandler.handleError.and.callFake((err: HttpErrorResponse) =>
        throwError(() => ({ statusText: err.statusText, code: err.status } as CommonError))
      );
      let error: any;
      service.updatePurchaseOrder({ id: 'o1' } as any).subscribe({ error: (e) => (error = e) });
      expectUrl('PUT', 'PurchaseOrder/o1').flush({ messages: ['nope'] }, { status: 422, statusText: 'Unprocessable Entity' });
      expect(error.code).toBe(422);
      expect(errorHandler.handleError).toHaveBeenCalled();
    });
  });
});
