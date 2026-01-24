import { inject, Injectable } from '@angular/core';
import { ProductCategory } from '@core/domain-classes/product-category';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProductCategoryService {

  httpClient = inject(HttpClient);

  getAll(isDropDown: boolean): Observable<ProductCategory[]> {
    const url = 'ProductCategories';
    return this.httpClient.get<ProductCategory[]>(url, { params: isDropDown ? { isDropDown: isDropDown} : {isDropDown : false} });
  }

  getAllSubCategories(parentId: string): Observable<ProductCategory[]> {
    const url = `ProductCategories/${parentId}/subcategories`;
    return this.httpClient.get<ProductCategory[]>(url);
  }

  getById(id: string): Observable<ProductCategory> {
    const url = 'ProductCategory/' + id;
    return this.httpClient.get<ProductCategory>(url);
  }

  delete(id: string): Observable<void> {
    const url = `ProductCategory/${id}`;
    return this.httpClient.delete<void>(url);
  }

  update(id: string, productCategory: ProductCategory): Observable<ProductCategory> {
    const url = 'ProductCategory/' + id;
    return this.httpClient.put<ProductCategory>(url, productCategory);
  }

  add(productCategory: ProductCategory): Observable<ProductCategory> {
    const url = 'ProductCategory';
    return this.httpClient.post<ProductCategory>(url, productCategory);
  }

}
