import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Inventory } from '@core/domain-classes/inventory';
import { InventoryHistory } from '@core/domain-classes/inventory-history';
import { InventoryHistoryResourceParameter } from '@core/domain-classes/inventory-history-resource-parameter';
import { InventoryResourceParameter } from '@core/domain-classes/inventory-resource-parameter';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class InventoryService {
  constructor(private http: HttpClient) { }

  getInventories(
    resourceParams: InventoryResourceParameter
  ): Observable<HttpResponse<Inventory[]>> {
    const url = 'ProductStock';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields)
      .set('orderBy', resourceParams.orderBy)
      .set('pageSize', resourceParams.pageSize.toString())
      .set('skip', resourceParams.skip.toString())
      .set('searchQuery', resourceParams.searchQuery)
      .set('locationId', resourceParams.locationId ? resourceParams.locationId : '')
      .set(
        'productName',
        resourceParams.productName ? resourceParams.productName : ''
      );

    return this.http.get<Inventory[]>(url, {
      params: customParams,
      observe: 'response',
    });
  }

  getInventoriesReport(
    resourceParams: InventoryResourceParameter
  ): Observable<HttpResponse<Inventory[]>> {
    const url = 'ProductStock';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields)
      .set('orderBy', resourceParams.orderBy)
      .set('pageSize', 0)
      .set('skip', 0)
      .set('searchQuery', resourceParams.searchQuery)
      .set('locationId', resourceParams.locationId ? resourceParams.locationId : '')
      .set(
        'productName',
        resourceParams.productName ? resourceParams.productName : ''
      );

    return this.http.get<Inventory[]>(url, {
      params: customParams,
      observe: 'response',
    });
  }

  addInventory(inventory: Inventory): Observable<Inventory> {
    const url = 'ProductStock';
    return this.http.post<Inventory>(url, inventory);
  }

  getInventoryHistories(
    resourceParams: InventoryHistoryResourceParameter
  ): Observable<HttpResponse<InventoryHistory[]>> {
    const url = 'ProductStock/history';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields)
      .set('orderBy', resourceParams.orderBy)
      .set('pageSize', resourceParams.pageSize.toString())
      .set('skip', resourceParams.skip.toString())
      .set('searchQuery', resourceParams.searchQuery)
      .set('locationId', resourceParams.locationId ? resourceParams.locationId : '')
      .set('productId', resourceParams.productId);

    return this.http.get<InventoryHistory[]>(url, {
      params: customParams,
      observe: 'response',
    });
  }

  getInventoryByProductId(
    productId: string,
    locationId: string
  ): Observable<number> {
    const url = 'ProductStock/count';
    const customParams = new HttpParams()
      .set('productId', productId)
      .set('locationId', locationId);

    return this.http.get<number>(url, {
      params: customParams,
    });
  }

  bulkUpdateProductStock(command: any): Observable<any> {
    const url = 'ProductStock/bulk-update';
    return this.http.post(url, command);
  }

  bulkAdjustProductStock(command: any): Observable<any> {
    const url = 'ProductStock/bulk-adjust';
    return this.http.post(url, command);
  }
}
