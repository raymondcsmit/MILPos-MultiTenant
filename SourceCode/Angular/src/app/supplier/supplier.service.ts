import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { HttpResponse, HttpClient, HttpParams } from '@angular/common/http';
import { SupplierPaymentResourceParameter, SupplierResourceParameter } from '@core/domain-classes/supplier-resource-parameter';
import { Supplier } from '@core/domain-classes/supplier';
import { SupplierPayment } from '@core/domain-classes/supplier-payment';

@Injectable({
  providedIn: 'root',
})
export class SupplierService {
  constructor(private http: HttpClient) { }

  getSuppliers(
    resourceParams: SupplierResourceParameter
  ): Observable<HttpResponse<Supplier[]>> {
    const url = 'supplier';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields)
      .set('orderBy', resourceParams.orderBy)
      .set('pageSize', resourceParams.pageSize.toString())
      .set('skip', resourceParams.skip.toString())
      .set('searchQuery', resourceParams.searchQuery)
      .set('supplierName', resourceParams.supplierName)
      .set('mobileNo', resourceParams.mobileNo)
      .set('email', resourceParams.email)
      .set('country', resourceParams.country ? resourceParams.country : '')
      .set('website', resourceParams.website ?? '')
      .set('id', resourceParams.id ? resourceParams.id : '');

    return this.http.get<Supplier[]>(url, {
      params: customParams,
      observe: 'response',
    });
  }

  getSupplier(id: string): Observable<Supplier> {
    const url = 'supplier/' + id;
    return this.http.get<Supplier>(url);
  }
  deleteSupplier(id: string): Observable<void> {
    const url = `supplier/${id}`;
    return this.http.delete<void>(url);
  }
  updateSupplier(id: string, supplier: Supplier): Observable<Supplier> {
    const url = 'supplier/' + id;
    return this.http.put<Supplier>(url, supplier);
  }
  saveSupplier(supplier: Supplier): Observable<Supplier> {
    const url = 'supplier';
    return this.http.post<Supplier>(url, supplier);
  }

  getSuppliersForDropDown(searchString: string, id?: string): Observable<Supplier[]> {
    const url = 'SupplierSearch';
    searchString = searchString ? searchString.trim() : '';
    let params = `?searchQuery=${searchString.trim()}&pageSize=10&id=${id ? id : ''}`;
    return this.http.get<Supplier[]>(url + params);
  }

  getSupplierPayments(
    resourceParams: SupplierPaymentResourceParameter
  ): Observable<HttpResponse<SupplierPayment[]>> {
    const url = 'supplier/getsupplierpayment';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields)
      .set('orderBy', resourceParams.orderBy)
      .set('pageSize', resourceParams.pageSize.toString())
      .set('skip', resourceParams.skip.toString())
      .set('searchQuery', resourceParams.searchQuery)
      .set('supplierName', resourceParams.supplierName)
      .set('locationId', resourceParams.locationId ? resourceParams.locationId : '');
    return this.http.get<SupplierPayment[]>(url, {
      params: customParams,
      observe: 'response',
    });
  }
}
