import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { catchError, Observable } from 'rxjs';
import { CustomerLadgerResourceParameter } from './customer-ladger-list/customer-ladger-resource-parameter';
import { CustomerLadger } from './customer-ladger';
import { Account } from './account';
import { SalesOrderOverdue } from './sales-overdue';
import { CustomerLadgerHistory } from './customer-ladger-history';
import { CommonError } from '@core/error-handler/common-error';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';

@Injectable({
  providedIn: 'root',
})
export class CustomerLadgerService {
  constructor(
    private httpClient: HttpClient,
    private commonHttpErrorService: CommonHttpErrorService
  ) {}

  getCustomerLadgers(
    resourceParams: CustomerLadgerResourceParameter
  ): Observable<HttpResponse<CustomerLadger[]>> {
    const url = 'CustomerLedger';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields)
      .set('orderBy', resourceParams.orderBy)
      .set('pageSize', resourceParams.pageSize.toString())
      .set('skip', resourceParams.skip.toString())
      .set('searchQuery', resourceParams.searchQuery)
      .set('locationId', resourceParams.locationId ?? '')
      .set('accountId', resourceParams.accountId ?? '')
      .set('reference', resourceParams.reference)
      .set('date', resourceParams.accountDate ? resourceParams.accountDate.toISOString() : '');
    return this.httpClient.get<CustomerLadger[]>(url, {
      params: customParams,
      observe: 'response',
    });
  }

  addCustomerLadgerHistory(
    customerLadgerHistory: CustomerLadgerHistory
  ): Observable<CustomerLadgerHistory | CommonError> {
    const url = 'CustomerLedger';
    return this.httpClient
      .post<CustomerLadgerHistory>(url, customerLadgerHistory)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  getSalesOrderOverdueByAccountId(accountId: string): Observable<SalesOrderOverdue> {
    const url = `CustomerLedger/${accountId}/overdue`;
    return this.httpClient.get<SalesOrderOverdue>(url);
  }

  getAccountsForDropDown(searchString: string, id?: string): Observable<Account[]> {
    const url = 'CustomerLedger/customerLedger';
    let params = `?searchQuery=${searchString ? searchString.trim() : ''}&pageSize=10&id=${
      id ? id : ''
    }`;
    return this.httpClient.get<Account[]>(url + params);
  }
}
