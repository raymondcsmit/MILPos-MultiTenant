import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { Observable } from 'rxjs/internal/Observable';
import { CommonError } from '@core/error-handler/common-error';
import { catchError } from 'rxjs';
import { CustomerSalesOrderResourceParameter } from './customer-sales-order-list/customer-sales-order-resource-parameter';
import { CustomerSalesOrder } from './customer-sales-order-list/customer-sales-order';
import { CustomerSalesOrderPayment } from './customer-sales-order-payment-list/customer-sales-order-payment';

@Injectable({
  providedIn: 'root',
})
export class CustomerSalesOrderService {
  constructor(
    private http: HttpClient,
    private commonHttpErrorService: CommonHttpErrorService
  ) { }

  getAllCustomerSalesOrder(
    resourceParams: CustomerSalesOrderResourceParameter
  ): Observable<HttpResponse<CustomerSalesOrder[]>> {
    const url = 'SalesOrder/pendingsalesorder';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields)
      .set('orderBy', resourceParams.orderBy ?? '')
      .set('pageSize', resourceParams.pageSize.toString())
      .set('skip', resourceParams.skip.toString())
      .set('searchQuery', resourceParams.searchQuery)
      .set('name', resourceParams.name)
      .set('customerId', resourceParams.customerId ?? '')
      .set('orderNumber', resourceParams.orderNumber)
      .set('customerName', resourceParams.customerName)
      .set(
        'paymentStatus',
        resourceParams.paymentStatus != null &&
          resourceParams.paymentStatus != undefined
          ? resourceParams.paymentStatus
          : ''
      )
      .set(
        'soCreatedDate',
        resourceParams.soCreatedDate ? resourceParams.soCreatedDate.toISOString() : ''
      )
      .set(
        'fromDate',
        resourceParams.fromDate ? resourceParams.fromDate.toISOString() : ''
      )
      .set(
        'toDate',
        resourceParams.toDate ? resourceParams.toDate.toISOString() : ''
      );
    return this.http.get<CustomerSalesOrder[]>(url, {
      params: customParams,
      observe: 'response',
    });
  }

  getCustomerSalesOrderPayments(customerId: string): Observable<CustomerSalesOrderPayment[]> {
    const url = `SalesOrder/customerpendingpayment/${customerId}`;
    return this.http.get<CustomerSalesOrderPayment[]>(url);
  }
}
