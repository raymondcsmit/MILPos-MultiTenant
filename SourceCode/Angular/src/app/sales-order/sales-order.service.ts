import {
  HttpClient,
  HttpEvent,
  HttpParams,
  HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TaxItem } from '@core/domain-classes/purchase-sales-order-tax-item';
import { OrderTotals } from '@core/domain-classes/purchase-sales-order-total';
import { SalesOrder } from '@core/domain-classes/sales-order';
import { SalesOrderItem } from '@core/domain-classes/sales-order-item';
import { SalesOrderResourceParameter } from '@core/domain-classes/sales-order-resource-parameter';
import { SalesOrderStatusEnum } from '@core/domain-classes/sales-order-status';
import { CommonError } from '@core/error-handler/common-error';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class SalesOrderService {
  constructor(
    private http: HttpClient,
    private commonHttpErrorService: CommonHttpErrorService
  ) { }

  getAllSalesOrder(
    resourceParams: SalesOrderResourceParameter
  ): Observable<HttpResponse<SalesOrder[]>> {
    const url = 'salesOrder';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields)
      .set('orderBy', resourceParams.orderBy)
      .set('pageSize', resourceParams.pageSize.toString())
      .set('skip', resourceParams.skip.toString())
      .set('searchQuery', resourceParams.searchQuery)
      .set('name', resourceParams.name)
      .set('orderNumber', resourceParams.orderNumber ?? '')
      .set('customerName', resourceParams.customerName ?? '')
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
        'customerId',
        resourceParams.customerId ? resourceParams.customerId : ''
      )
      .set('status', resourceParams.status ?? '')
      .set(
        'locationId',
        resourceParams.locationId ? resourceParams.locationId : ''
      ).set(
        'isSalesOrderRequest',
        resourceParams.isSalesOrderRequest
      )
      .set('deliveryStatus', resourceParams.deliveryStatus != null && resourceParams.deliveryStatus != undefined ? resourceParams.deliveryStatus : '')
      .set('paymentStatus', resourceParams.paymentStatus != null && resourceParams.paymentStatus != undefined ? resourceParams.paymentStatus : '');
    return this.http.get<SalesOrder[]>(url, {
      params: customParams,
      observe: 'response',
    });
  }

  getSaleOrderForReturnByCustomerId(resourceParams: SalesOrderResourceParameter) {
    const url = 'salesOrder/returns';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields)
      .set('orderBy', resourceParams.orderBy)
      .set('pageSize', resourceParams.pageSize.toString())
      .set('skip', resourceParams.skip.toString())
      .set('searchQuery', resourceParams.searchQuery)
      .set('name', resourceParams.name)
      .set('orderNumber', resourceParams.orderNumber ?? '')
      .set('customerName', resourceParams.customerName ?? '')
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
        'customerId',
        resourceParams.customerId ? resourceParams.customerId : ''
      )
      .set('status', resourceParams.status ?? '')
      .set(
        'locationId',
        resourceParams.locationId ? resourceParams.locationId : ''
      ).set(
        'isSalesOrderRequest',
        resourceParams.isSalesOrderRequest
      )
      .set('deliveryStatus', resourceParams.deliveryStatus != null && resourceParams.deliveryStatus != undefined ? resourceParams.deliveryStatus : '')
      .set('paymentStatus', resourceParams.paymentStatus != null && resourceParams.paymentStatus != undefined ? resourceParams.paymentStatus : '');
    return this.http.get<SalesOrder[]>(url, {
      params: customParams,
    });
  }

  getAllSalesOrderExcel(
    resourceParams: SalesOrderResourceParameter
  ): Observable<HttpResponse<SalesOrder[]>> {
    const url = 'salesOrder';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields)
      .set('orderBy', resourceParams.orderBy)
      .set('pageSize', "0")
      .set('skip', "0")
      .set('searchQuery', resourceParams.searchQuery)
      .set('name', resourceParams.name)
      .set('orderNumber', resourceParams.orderNumber ?? '')
      .set('customerName', resourceParams.customerName ?? '')
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
        'customerId',
        resourceParams.customerId ? resourceParams.customerId : ''
      )
      .set(
        'locationId',
        resourceParams.locationId ? resourceParams.locationId : ''
      )
      .set('isSalesOrderRequest', resourceParams.isSalesOrderRequest)
      .set('status', SalesOrderStatusEnum.All.toString())
      .set('deliveryStatus', resourceParams.deliveryStatus ? resourceParams.deliveryStatus : '')
      .set('paymentStatus', resourceParams.paymentStatus ? resourceParams.paymentStatus : '');
    return this.http.get<SalesOrder[]>(url, {
      params: customParams,
      observe: 'response',
    });
  }

  addSalesOrder(salesOrder: SalesOrder): Observable<SalesOrder> {
    const url = `salesOrder`;
    return this.http
      .post<SalesOrder>(url, salesOrder);
  }

  updateSalesOrder(
    salesOrder: SalesOrder
  ): Observable<SalesOrder | CommonError> {
    const url = `salesOrder/${salesOrder.id}`;
    return this.http
      .put<SalesOrder>(url, salesOrder)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  updateSalesOrderReturn(
    salesOrder: SalesOrder
  ): Observable<SalesOrder | CommonError> {
    const url = `salesOrder/${salesOrder.id}/return`;
    return this.http
      .put<SalesOrder>(url, salesOrder)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  markasdelivered(id: string): Observable<SalesOrder | CommonError> {
    const url = `salesOrder/${id}/markasdelivered`;
    return this.http
      .put<SalesOrder>(url, {})
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  deleteSalesOrder(id: string): Observable<void | CommonError> {
    const url = `salesOrder/${id}`;
    return this.http
      .delete<void>(url)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  getNewSalesOrderNumber(isSalesOrderRequest: boolean): Observable<SalesOrder> {
    const url = `salesOrder/newOrderNumber/${isSalesOrderRequest}`;
    return this.http.get<SalesOrder>(url);
  }

  getNewSalesOrderRequestNumber(): Observable<SalesOrder> {
    const url = `salesOrder-request/newOrderNumber`;
    return this.http.get<SalesOrder>(url);
  }

  getSalesOrderById(salesOrderId: string): Observable<SalesOrder> {
    const url = `salesOrder/${salesOrderId}`;
    return this.http.get<SalesOrder>(url);
  }
  getSalesOrderByIdReturnItems(salesOrderId: string): Observable<SalesOrderItem[]> {
    const url = `salesOrder/${salesOrderId}/returnItems`;
    return this.http.get<SalesOrderItem[]>(url);
  }

  getSalesOrderItems(
    salesOrderId: string,
    isReturn: boolean = false
  ): Observable<SalesOrderItem[]> {
    const url = `salesOrder/${salesOrderId}/items?isReturn=${isReturn}`;
    return this.http.get<SalesOrderItem[]>(url);
  }

  downloadAttachment(id: string): Observable<HttpEvent<Blob>> {
    const url = `salesOrderAttachment/${id}/download`;
    return this.http.get(url, {
      reportProgress: true,
      observe: 'events',
      responseType: 'blob',
    });
  }

  getSalesOrderItemReport(
    resourceParams: SalesOrderResourceParameter
  ): Observable<HttpResponse<SalesOrderItem[]>> {
    const url = 'salesOrder/items/reports';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields)
      .set('orderBy', resourceParams.orderBy)
      .set('pageSize', resourceParams.pageSize.toString())
      .set('skip', resourceParams.skip.toString())
      .set('searchQuery', resourceParams.searchQuery)
      .set('name', resourceParams.name)
      .set('orderNumber', resourceParams.orderNumber ?? '')
      .set('customerName', resourceParams.customerName ?? '')
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
        'customerId',
        resourceParams.customerId ? resourceParams.customerId : ''
      )
      .set(
        'locationId',
        resourceParams.locationId ? resourceParams.locationId : ''
      )
      .set('isSalesOrderRequest', resourceParams.isSalesOrderRequest);
    return this.http.get<SalesOrderItem[]>(url, {
      params: customParams,
      observe: 'response',
    });
  }

  getSalesOrderTaxItems(
    salesOrderId: string
  ): Observable<TaxItem[]> {
    const url = `salesOrder/${salesOrderId}/tax-item`;
    return this.http.get<TaxItem[]>(url);
  }

  getSalesOrderTotal(
    resourceParams: SalesOrderResourceParameter
  ): Observable<OrderTotals> {
    const url = 'salesOrder/total';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields)
      .set('orderBy', resourceParams.orderBy)
      .set('pageSize', resourceParams.pageSize.toString())
      .set('skip', resourceParams.skip.toString())
      .set('searchQuery', resourceParams.searchQuery)
      .set('name', resourceParams.name)
      .set('orderNumber', resourceParams.orderNumber ?? '')
      .set('customerName', resourceParams.customerName ?? '')
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
        'customerId',
        resourceParams.customerId ? resourceParams.customerId : ''
      )
      .set('isSalesOrderRequest', resourceParams.isSalesOrderRequest)
      .set(
        'soCreatedDate',
        resourceParams.soCreatedDate
          ? resourceParams.soCreatedDate.toISOString()
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

  getTotalByTaxForSalesOrder(
    resourceParams: SalesOrderResourceParameter
  ): Observable<TaxItem[]> {
    const url = 'salesOrder/tax-item-total';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields)
      .set('orderBy', resourceParams.orderBy)
      .set('pageSize', resourceParams.pageSize.toString())
      .set('skip', resourceParams.skip.toString())
      .set('searchQuery', resourceParams.searchQuery)
      .set('name', resourceParams.name)
      .set('orderNumber', resourceParams.orderNumber ?? '')
      .set('customerName', resourceParams.customerName ?? '')
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
        'customerId',
        resourceParams.customerId ? resourceParams.customerId : ''
      )
      .set('isSalesOrderRequest', resourceParams.isSalesOrderRequest)
      .set(
        'soCreatedDate',
        resourceParams.soCreatedDate
          ? resourceParams.soCreatedDate.toISOString()
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
}
