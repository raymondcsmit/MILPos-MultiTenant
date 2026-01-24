import {
  HttpClient,
  HttpEvent,
  HttpParams,
  HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';
import { PurchaseOrderItem } from '@core/domain-classes/purchase-order-item';
import { PurchaseOrderResourceParameter } from '@core/domain-classes/purchase-order-resource-parameter';
import { TaxItem } from '@core/domain-classes/purchase-sales-order-tax-item';
import { OrderTotals } from '@core/domain-classes/purchase-sales-order-total';
import { CommonError } from '@core/error-handler/common-error';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { Observable } from 'rxjs/internal/Observable';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class PurchaseOrderService {
  constructor(
    private http: HttpClient,
    private commonHttpErrorService: CommonHttpErrorService
  ) { }

  getAllPurchaseOrder(
    resourceParams: PurchaseOrderResourceParameter
  ): Observable<HttpResponse<PurchaseOrder[]>> {
    const url = 'purchaseorder';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields)
      .set('orderBy', resourceParams.orderBy ?? '')
      .set('pageSize', resourceParams.pageSize.toString())
      .set('skip', resourceParams.skip.toString())
      .set('searchQuery', resourceParams.searchQuery)
      .set('name', resourceParams.name)
      .set('orderNumber', resourceParams.orderNumber ?? '')
      .set('supplierName', resourceParams.supplierName ?? '')
      .set(
        'fromDate',
        resourceParams.fromDate ? resourceParams.fromDate.toISOString() : ''
      )
      .set(
        'toDate',
        resourceParams.toDate ? resourceParams.toDate.toISOString() : ''
      )
      .set(
        'productId',
        resourceParams.productId ? resourceParams.productId : ''
      )
      .set(
        'supplierId',
        resourceParams.supplierId ? resourceParams.supplierId : ''
      )
      .set('isPurchaseOrderRequest', resourceParams.isPurchaseOrderRequest)
      .set(
        'poCreatedDate',
        resourceParams.poCreatedDate
          ? resourceParams.poCreatedDate.toISOString()
          : ''
      )
      .set('status', resourceParams.status ?? '')
      .set(
        'locationId',
        resourceParams.locationId ? resourceParams.locationId : ''
      )
      .set('paymentStatus', resourceParams.paymentStatus != null && resourceParams.paymentStatus != undefined ? resourceParams.paymentStatus : '')
      .set('deliveryStatus', resourceParams.deliveryStatus != null && resourceParams.deliveryStatus != undefined ? resourceParams.deliveryStatus : '');
    return this.http.get<PurchaseOrder[]>(url, {
      params: customParams,
      observe: 'response',
    });
  }

  getPurchaseOrderItemReport(
    resourceParams: PurchaseOrderResourceParameter
  ): Observable<HttpResponse<PurchaseOrderItem[]>> {
    const url = 'purchaseorder/items/reports';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields)
      .set('orderBy', resourceParams.orderBy)
      .set('pageSize', resourceParams.pageSize.toString())
      .set('skip', resourceParams.skip.toString())
      .set('searchQuery', resourceParams.searchQuery)
      .set('name', resourceParams.name)
      .set('orderNumber', resourceParams.orderNumber ?? '')
      .set('supplierName', resourceParams.supplierName ?? '')
      .set(
        'fromDate',
        resourceParams.fromDate ? resourceParams.fromDate.toISOString() : ''
      )
      .set(
        'toDate',
        resourceParams.toDate ? resourceParams.toDate.toISOString() : ''
      )
      .set(
        'productId',
        resourceParams.productId ? resourceParams.productId : ''
      )
      .set(
        'productName',
        resourceParams.productName ? resourceParams.productName : ''
      )
      .set(
        'supplierId',
        resourceParams.supplierId ? resourceParams.supplierId : ''
      )
      .set(
        'locationId',
        resourceParams.locationId ? resourceParams.locationId : ''
      )
      .set('isPurchaseOrderRequest', resourceParams.isPurchaseOrderRequest);
    return this.http.get<PurchaseOrderItem[]>(url, {
      params: customParams,
      observe: 'response',
    });
  }

  getPurchaseOrderByIdReturnItems(purchaseOrderId: string): Observable<PurchaseOrderItem[]> {
    const url = `PurchaseOrder/${purchaseOrderId}/returnItems`;
    return this.http.get<PurchaseOrderItem[]>(url);
  }


  getAllPurchaseOrderItemReport(
    resourceParams: PurchaseOrderResourceParameter
  ): Observable<HttpResponse<PurchaseOrderItem[]>> {
    const url = 'purchaseorder/items/reports';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields)
      .set('orderBy', resourceParams.orderBy)
      .set('pageSize', 0)
      .set('skip', 0)
      .set('searchQuery', resourceParams.searchQuery)
      .set('name', resourceParams.name)
      .set('orderNumber', resourceParams.orderNumber ?? '')
      .set('supplierName', resourceParams.supplierName ?? '')
      .set(
        'fromDate',
        resourceParams.fromDate ? resourceParams.fromDate.toISOString() : ''
      )
      .set(
        'toDate',
        resourceParams.toDate ? resourceParams.toDate.toISOString() : ''
      )
      .set(
        'productId',
        resourceParams.productId ? resourceParams.productId : ''
      )
      .set(
        'productName',
        resourceParams.productName ? resourceParams.productName : ''
      )
      .set(
        'supplierId',
        resourceParams.supplierId ? resourceParams.supplierId : ''
      )
      .set(
        'locationId',
        resourceParams.locationId ? resourceParams.locationId : ''
      )
      .set('isPurchaseOrderRequest', resourceParams.isPurchaseOrderRequest);
    return this.http.get<PurchaseOrderItem[]>(url, {
      params: customParams,
      observe: 'response',
    });
  }

  addPurchaseOrder(
    purchaseOrder: PurchaseOrder
  ): Observable<PurchaseOrder> {
    const url = `PurchaseOrder`;
    return this.http
      .post<PurchaseOrder>(url, purchaseOrder);
  }

  updatePurchaseOrder(
    purchaseOrder: PurchaseOrder
  ): Observable<PurchaseOrder | CommonError> {
    const url = `PurchaseOrder/${purchaseOrder.id}`;
    return this.http
      .put<PurchaseOrder>(url, purchaseOrder)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  markAsReceived(id: string): Observable<PurchaseOrder | CommonError> {
    const url = `PurchaseOrder/${id}/markasreceived`;
    return this.http
      .put<PurchaseOrder>(url, {})
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  updatePurchaseOrderReturn(
    purchaseOrder: PurchaseOrder
  ): Observable<PurchaseOrder | CommonError> {
    const url = `PurchaseOrder/${purchaseOrder.id}/return`;
    return this.http
      .put<PurchaseOrder>(url, purchaseOrder)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  deletePurchaseOrder(id: string): Observable<void | CommonError> {
    const url = `PurchaseOrder/${id}`;
    return this.http
      .delete<void>(url)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  getNewPurchaseOrderNumber(
    isPurchaseOrder: boolean
  ): Observable<PurchaseOrder> {
    const url = `purchaseorder/newOrderNumber/${isPurchaseOrder}`;
    return this.http.get<PurchaseOrder>(url);
  }

  getPurchaseOrderById(purchaseOrderId: string): Observable<PurchaseOrder> {
    const url = `purchaseorder/${purchaseOrderId}`;
    return this.http.get<PurchaseOrder>(url);
  }

  getPurchaseOrderItems(
    purchaseOrderId: string,
    isReturn: boolean = false
  ): Observable<PurchaseOrderItem[]> {
    const url = `purchaseorder/${purchaseOrderId}/items?isReturn=${isReturn}`;
    return this.http.get<PurchaseOrderItem[]>(url);
  }

  getPurchaseOrderTaxItems(
    purchaseOrderId: string
  ): Observable<TaxItem[]> {
    const url = `purchaseorder/${purchaseOrderId}/tax-item`;
    return this.http.get<TaxItem[]>(url);
  }

  getPurchaseOrderTotal(
    resourceParams: PurchaseOrderResourceParameter
  ): Observable<OrderTotals> {
    const url = 'purchaseorder/total';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields)
      .set('orderBy', resourceParams.orderBy)
      .set('pageSize', resourceParams.pageSize.toString())
      .set('skip', resourceParams.skip.toString())
      .set('searchQuery', resourceParams.searchQuery)
      .set('name', resourceParams.name)
      .set('orderNumber', resourceParams.orderNumber ?? '')
      .set('supplierName', resourceParams.supplierName ?? '')
      .set(
        'fromDate',
        resourceParams.fromDate ? resourceParams.fromDate.toISOString() : ''
      )
      .set(
        'toDate',
        resourceParams.toDate ? resourceParams.toDate.toISOString() : ''
      )
      .set(
        'productId',
        resourceParams.productId ? resourceParams.productId : ''
      )
      .set(
        'supplierId',
        resourceParams.supplierId ? resourceParams.supplierId : ''
      )
      .set('isPurchaseOrderRequest', resourceParams.isPurchaseOrderRequest)
      .set(
        'poCreatedDate',
        resourceParams.poCreatedDate
          ? resourceParams.poCreatedDate.toISOString()
          : ''
      )
      .set('status', resourceParams.status ?? '')
      .set(
        'locationId',
        resourceParams.locationId ? resourceParams.locationId : ''
      );
    return this.http.get<OrderTotals>(url, {
      params: customParams
    });
  }

  getTotalByTaxForPurchaseOrder(
    resourceParams: PurchaseOrderResourceParameter
  ): Observable<TaxItem[]> {
    const url = 'purchaseorder/tax-item-total';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields)
      .set('orderBy', resourceParams.orderBy)
      .set('pageSize', resourceParams.pageSize.toString())
      .set('skip', resourceParams.skip.toString())
      .set('searchQuery', resourceParams.searchQuery)
      .set('name', resourceParams.name)
      .set('orderNumber', resourceParams.orderNumber ?? '')
      .set('supplierName', resourceParams.supplierName ?? '')
      .set(
        'fromDate',
        resourceParams.fromDate ? resourceParams.fromDate.toISOString() : ''
      )
      .set(
        'toDate',
        resourceParams.toDate ? resourceParams.toDate.toISOString() : ''
      )
      .set(
        'productId',
        resourceParams.productId ? resourceParams.productId : ''
      )
      .set(
        'supplierId',
        resourceParams.supplierId ? resourceParams.supplierId : ''
      )
      .set('isPurchaseOrderRequest', resourceParams.isPurchaseOrderRequest)
      .set(
        'poCreatedDate',
        resourceParams.poCreatedDate
          ? resourceParams.poCreatedDate.toISOString()
          : ''
      )
      .set('status', resourceParams.status ?? '')
      .set(
        'locationId',
        resourceParams.locationId ? resourceParams.locationId : ''
      );
    return this.http.get<TaxItem[]>(url, {
      params: customParams
    });
  }

  downloadAttachment(id: string): Observable<HttpEvent<Blob>> {
    const url = `PurchaseOrderAttachment/${id}/download`;
    return this.http.get(url, {
      reportProgress: true,
      observe: 'events',
      responseType: 'blob',
    });
  }
}
