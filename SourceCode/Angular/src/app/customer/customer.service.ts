import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { HttpResponse, HttpClient, HttpParams } from '@angular/common/http';
import { CustomerResourceParameter } from '@core/domain-classes/customer-resource-parameter';
import { Customer } from '@core/domain-classes/customer';
import { CustomerPayment } from '@core/domain-classes/customer-payment';

@Injectable({
  providedIn: 'root',
})
export class CustomerService {
  constructor(private http: HttpClient) { }

  getCustomers(
    resourceParams: CustomerResourceParameter
  ): Observable<HttpResponse<Customer[]>> {
    const url = 'customer';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields)
      .set('orderBy', resourceParams.orderBy)
      .set('pageSize', resourceParams.pageSize.toString())
      .set('skip', resourceParams.skip.toString())
      .set('searchQuery', resourceParams.searchQuery)
      .set('customerName', resourceParams.customerName)
      .set('mobileNo', resourceParams.mobileNo)
      .set('phoneNo', resourceParams.phoneNo)
      .set('email', resourceParams.email)
      .set('contactPerson', resourceParams.contactPerson)
      .set('website', resourceParams.website)
      .set('id', resourceParams.id ? resourceParams.id : '');
    return this.http.get<Customer[]>(url, {
      params: customParams,
      observe: 'response',
    });
  }

  getCustomersForDropDown(searchString: string, id?: string, isPOS: boolean = false): Observable<Customer[]> {
    const url = 'customerSearch';
    let params = `?isPOS=${isPOS}&searchQuery=${searchString ? searchString.trim() : ''}&pageSize=10&id=${id ? id : ''}`;
    return this.http.get<Customer[]>(url + params);
  }

  getCustomer(id: string): Observable<Customer> {
    const url = 'customer/' + id;
    return this.http.get<Customer>(url);
  }

  deleteCustomer(id: string): Observable<void> {
    const url = 'customer/' + id;
    return this.http.delete<void>(url);
  }
  updateCustomer(id: string, customer: Customer): Observable<Customer> {
    const url = 'customer/' + id;
    return this.http.put<Customer>(url, customer);
  }
  saveCustomer(customer: Customer): Observable<Customer> {
    const url = 'customer';
    return this.http.post<Customer>(url, customer);
  }

  getCustomerPayments(
    resourceParams: CustomerResourceParameter
  ): Observable<HttpResponse<CustomerPayment[]>> {
    const url = 'customer/getcustomerpayment';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields)
      .set('orderBy', resourceParams.orderBy)
      .set('pageSize', resourceParams.pageSize.toString())
      .set('skip', resourceParams.skip.toString())
      .set('searchQuery', resourceParams.searchQuery)
      .set('customerName', resourceParams.customerName)
      .set('locationId', resourceParams.locationId ? resourceParams.locationId : '');
    return this.http.get<CustomerPayment[]>(url, {
      params: customParams,
      observe: 'response',
    });
  }
}
