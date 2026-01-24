import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { PurchaseOrderResourceParameter } from '@core/domain-classes/purchase-order-resource-parameter';
import { Observable } from 'rxjs';
import { PurchaseOrderPayment } from '@core/domain-classes/purchase-order-payment';

@Injectable({ providedIn: 'root' })
export class PurchasePaymentReportService {
  constructor(private httpClient: HttpClient) {

  }

  getAllPurchaseOrderPaymentReport(
    resourceParams: PurchaseOrderResourceParameter
  ): Observable<HttpResponse<PurchaseOrderPayment[]>> {
    const url = 'purchaseorderpayment/report';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields)
      .set('orderBy', resourceParams.orderBy)
      .set('pageSize', resourceParams.pageSize.toString())
      .set('skip', resourceParams.skip.toString())
      .set('searchQuery', resourceParams.searchQuery)
      .set('name', resourceParams.name)
      .set('orderNumber', resourceParams.orderNumber ?? '')
      .set('supplierName', resourceParams.supplierName ?? '')
      .set('fromDate', resourceParams.fromDate ? resourceParams.fromDate.toISOString() : '')
      .set('toDate', resourceParams.toDate ? resourceParams.toDate.toISOString() : '')
      .set('productId', resourceParams.productId ? resourceParams.productId : '')
      .set('supplierId', resourceParams.supplierId ? resourceParams.supplierId : '')
      .set('locationId', resourceParams.locationId ? resourceParams.locationId : '')
      .set('isPurchaseOrderRequest', resourceParams.isPurchaseOrderRequest)
    return this.httpClient.get<PurchaseOrderPayment[]>(url, {
      params: customParams,
      observe: 'response'
    });
  }
  getAllPurchaseOrderPaymentReportExcel(
    resourceParams: PurchaseOrderResourceParameter
  ): Observable<HttpResponse<PurchaseOrderPayment[]>> {
    const url = 'purchaseorderpayment/report';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields)
      .set('orderBy', resourceParams.orderBy)
      .set('pageSize', "0")
      .set('skip', "0")
      .set('searchQuery', resourceParams.searchQuery)
      .set('name', resourceParams.name)
      .set('orderNumber', resourceParams.orderNumber ?? '')
      .set('supplierName', resourceParams.supplierName ?? '')
      .set('fromDate', resourceParams.fromDate ? resourceParams.fromDate.toISOString() : '')
      .set('toDate', resourceParams.toDate ? resourceParams.toDate.toISOString() : '')
      .set('productId', resourceParams.productId ? resourceParams.productId : '')
      .set('supplierId', resourceParams.supplierId ? resourceParams.supplierId : '')
      .set('locationId', resourceParams.locationId ? resourceParams.locationId : '')
      .set('isPurchaseOrderRequest', resourceParams.isPurchaseOrderRequest)
    return this.httpClient.get<PurchaseOrderPayment[]>(url, {
      params: customParams,
      observe: 'response'
    });
  }

}
