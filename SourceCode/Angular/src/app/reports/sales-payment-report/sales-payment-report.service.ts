import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SalesOrderResourceParameter } from '@core/domain-classes/sales-order-resource-parameter';
import { SalesOrderPayment } from '@core/domain-classes/sales-order-payment';

@Injectable({ providedIn: 'root' })
export class SalesPaymentReportService {
  constructor(private httpClient: HttpClient) {

  }

  getAllSalesOrderPaymentReport(
    resourceParams: SalesOrderResourceParameter
  ): Observable<HttpResponse<SalesOrderPayment[]>> {
    const url = 'salesorderpayment/report';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields)
      .set('orderBy', resourceParams.orderBy)
      .set('pageSize', resourceParams.pageSize.toString())
      .set('skip', resourceParams.skip.toString())
      .set('searchQuery', resourceParams.searchQuery)
      .set('name', resourceParams.name)
      .set('orderNumber', resourceParams.orderNumber ?? '')
      .set('customerName', resourceParams.customerName ?? '')
      .set('fromDate', resourceParams.fromDate ? resourceParams.fromDate.toISOString() : '')
      .set('toDate', resourceParams.toDate ? resourceParams.toDate.toISOString() : '')
      .set('productId', resourceParams.productId ? resourceParams.productId : '')
      .set('locationId', resourceParams.locationId ? resourceParams.locationId : '')
      .set('customerId', resourceParams.customerId ? resourceParams.customerId : '')
      .set('isSalesOrderRequest', resourceParams.isSalesOrderRequest)
    return this.httpClient.get<SalesOrderPayment[]>(url, {
      params: customParams,
      observe: 'response'
    });
  }

  getAllSalesOrderPaymentReportExcel(
    resourceParams: SalesOrderResourceParameter
  ): Observable<HttpResponse<SalesOrderPayment[]>> {
    const url = 'salesorderpayment/report';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields)
      .set('orderBy', resourceParams.orderBy)
      .set('pageSize', "0")
      .set('skip', "0")
      .set('searchQuery', resourceParams.searchQuery)
      .set('name', resourceParams.name)
      .set('orderNumber', resourceParams.orderNumber ?? '')
      .set('customerName', resourceParams.customerName ?? '')
      .set('fromDate', resourceParams.fromDate ? resourceParams.fromDate.toISOString() : '')
      .set('toDate', resourceParams.toDate ? resourceParams.toDate.toISOString() : '')
      .set('productId', resourceParams.productId ? resourceParams.productId : '')
      .set('locationId', resourceParams.locationId ? resourceParams.locationId : '')
      .set('customerId', resourceParams.customerId ? resourceParams.customerId : '')
      .set('isSalesOrderRequest', resourceParams.isSalesOrderRequest)
    return this.httpClient.get<SalesOrderPayment[]>(url, {
      params: customParams,
      observe: 'response'
    });
  }

}
