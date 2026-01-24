import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Product } from '@core/domain-classes/product';
import { ProductQuantityAlert } from '@core/domain-classes/product-quantity-alert';
import { ProductResourceParameter } from '@core/domain-classes/product-resource-parameter';
import { ProductUnit } from '@core/domain-classes/product-unit';
import { CommonError } from '@core/error-handler/common-error';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { catchError, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  constructor(private http: HttpClient,
    private commonHttpErrorService: CommonHttpErrorService
  ) { }

  getProductsDropdown(
    resourceParams: ProductResourceParameter
  ): Observable<Product[]> {
    const url = 'product/dropdowns';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields)
      .set('orderBy', resourceParams.orderBy ? resourceParams.orderBy : 'name asc')
      .set('pageSize', resourceParams.parentId ? '0' : resourceParams.pageSize.toString())
      .set('skip', resourceParams.skip.toString())
      .set('searchQuery', resourceParams.searchQuery)
      .set('name', resourceParams.name)
      .set('id', resourceParams.id ?? '')
      .set(
        'categoryId',
        resourceParams.categoryId ? resourceParams.categoryId : ''
      )
      .set('unitId', resourceParams.unitId ? resourceParams.unitId : '')
      .set('barcode', resourceParams.barcode ? resourceParams.barcode : '')
      .set(
        'brandId',
        resourceParams ? resourceParams.brandId ?? '' : ''
      )
      .set(
        'productType',
        resourceParams.productType ? resourceParams.productType : ''
      ).set(
        'parentId',
        resourceParams.parentId ? resourceParams.parentId : ''
      ).set('isBarcodeGenerated', resourceParams.isBarcodeGenerated ?? false);
    return this.http.get<Product[]>(url, {
      params: customParams,
    });
  }

  getProducts(
    resourceParams: ProductResourceParameter
  ): Observable<HttpResponse<Product[]>> {
    const url = 'product';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields)
      .set('orderBy', resourceParams.orderBy ? resourceParams.orderBy : 'name asc')
      .set('pageSize', resourceParams.parentId ? '0' : resourceParams.pageSize.toString())
      .set('skip', resourceParams.skip.toString())
      .set('searchQuery', resourceParams.searchQuery)
      .set('name', resourceParams.name)
      .set('id', resourceParams.id ?? '')
      .set(
        'categoryId',
        resourceParams.categoryId ? resourceParams.categoryId : ''
      )
      .set('unitId', resourceParams.unitId ? resourceParams.unitId : '')
      .set('barcode', resourceParams.barcode ? resourceParams.barcode : '')
      .set(
        'brandId',
        resourceParams ? resourceParams.brandId ?? '' : ''
      )
      .set(
        'productType',
        resourceParams.productType ? resourceParams.productType : ''
      ).set(
        'parentId',
        resourceParams.parentId ? resourceParams.parentId : ''
      ).set('isBarcodeGenerated', resourceParams.isBarcodeGenerated ?? false);
    return this.http.get<Product[]>(url, {
      params: customParams,
      observe: 'response',
    });
  }

  getProudct(id: string): Observable<Product> {
    const url = `product/${id}`;
    return this.http.get<Product>(url);
  }

  addProudct(product: Product): Observable<Product> {
    const url = 'product';
    return this.http.post<Product>(url, product);
  }

  updateProudct(id: string, product: Product): Observable<Product> {
    const url = `product/${id}`;
    return this.http.put<Product>(url, product);
  }

  deleteProudct(id: string): Observable<void> {
    const url = `product/${id}`;
    return this.http.delete<void>(url);
  }

  getProductsInventory(locationId: string, productIds: ProductUnit[]): Observable<ProductQuantityAlert[]> {
    const url = `ProductStock/check`;
    return this.http
      .post<ProductQuantityAlert[]>(url, {
        locationId: locationId,
        productIds: productIds
      });

  }
}
