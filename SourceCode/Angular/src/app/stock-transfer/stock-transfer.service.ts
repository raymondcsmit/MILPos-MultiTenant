import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { StockTransferResourceParameter } from '@core/domain-classes/stockTransfer-resource-parameter';
import { StockTransfer } from '@core/domain-classes/stockTransfer';
import { Observable } from 'rxjs';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';

@Injectable({
  providedIn: 'root',
})
export class StockTransferService {
  constructor(
    private http: HttpClient,
    private commonHttpErrorService: CommonHttpErrorService
  ) { }

  getStockTransfers(
    resourceParams: StockTransferResourceParameter
  ): Observable<HttpResponse<StockTransfer[]>> {
    const url = 'stockTransfer';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields)
      .set('orderBy', resourceParams.orderBy)
      .set('pageSize', resourceParams.pageSize.toString())
      .set('skip', resourceParams.skip.toString())
      .set('searchQuery', resourceParams.searchQuery)
      .set('referenceNo', resourceParams.referenceNo)
      .set('id', resourceParams.id ?? '')
      .set(
        'fromLocationId',
        resourceParams.fromLocationId ? resourceParams.fromLocationId : ''
      )
      .set(
        'toLocationId',
        resourceParams.toLocationId ? resourceParams.toLocationId : ''
      );
    return this.http.get<StockTransfer[]>(url, {
      params: customParams,
      observe: 'response',
    });
  }

  getStockTransfer(id: string): Observable<StockTransfer> {
    const url = `stockTransfer/${id}`;
    return this.http.get<StockTransfer>(url);
  }

  addStockTransfer(
    stockTransfer: StockTransfer
  ): Observable<StockTransfer> {
    const url = 'stockTransfer';
    return this.http
      .post<StockTransfer>(url, stockTransfer);

  }

  updateStockTransfer(
    id: string,
    stockTransfer: StockTransfer
  ): Observable<StockTransfer> {
    const url = `stockTransfer/${id}`;
    return this.http.put<StockTransfer>(url, stockTransfer);
  }

  deleteStockTransfer(id: string): Observable<void> {
    const url = `stockTransfer/${id}`;
    return this.http.delete<void>(url);
  }
}
