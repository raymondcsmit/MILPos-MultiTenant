import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { StockTransfer } from '@core/domain-classes/stockTransfer';
import { Observable } from 'rxjs';
import { CommonError } from '@core/error-handler/common-error';
import { catchError } from 'rxjs/operators';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { DamagedStock } from '@core/domain-classes/damaged-stock';
import { DamagedStockResourceParameter } from '@core/domain-classes/damaged-stock-resource-parameter';

@Injectable({
  providedIn: 'root',
})
export class DamagedStockService {
  constructor(
    private http: HttpClient,
    private commonHttpErrorService: CommonHttpErrorService
  ) { }

  addDamagedStock(
    damagedStock: DamagedStock
  ): Observable<DamagedStock> {
    const url = 'DamagedStock';
    return this.http
      .post<DamagedStock>(url, damagedStock);
  }

  getDamagedStocks(resourceParams: DamagedStockResourceParameter): Observable<HttpResponse<DamagedStock[]>> {
    const url = 'DamagedStock';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields)
      .set('orderBy', resourceParams.orderBy)
      .set('pageSize', resourceParams.pageSize.toString())
      .set('skip', resourceParams.skip.toString())
      .set('searchQuery', resourceParams.searchQuery)
      .set('id', resourceParams.id ?? '')
      .set('locationId', resourceParams.locationId ?? '')
      .set('productId', resourceParams.productId ?? '')
      .set('damagedDate', resourceParams.damagedDate ? resourceParams.damagedDate.toISOString() : '');

    return this.http.get<DamagedStock[]>(url, {
      params: customParams,
      observe: 'response',
    });
  }
}
