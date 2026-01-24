import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { Observable } from 'rxjs/internal/Observable';
import { TransactionResourceParameter } from './transaction-list/transaction-resource-parameter';
import { Transaction } from './transaction';
import { TransactionItem } from './transaction-item';
import { CommonError } from '@core/error-handler/common-error';
import { catchError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  constructor(
    private http: HttpClient,
    private commonHttpErrorService: CommonHttpErrorService
  ) { }

  getAllTransaction(
    resourceParams: TransactionResourceParameter
  ): Observable<HttpResponse<Transaction[]>> {
    const url = 'transaction';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields)
      .set('orderBy', resourceParams.orderBy ?? '')
      .set('pageSize', resourceParams.pageSize.toString())
      .set('skip', resourceParams.skip.toString())
      .set('searchQuery', resourceParams.searchQuery)
      .set('name', resourceParams.name)
      .set('transactionNumber', resourceParams.transactionNumber ?? '')
      .set('referenceNumber', resourceParams.referenceNumber ?? '')
      .set(
        'paymentStatus',
        resourceParams.paymentStatus != null &&
          resourceParams.paymentStatus != undefined
          ? resourceParams.paymentStatus
          : ''
      )
      .set(
        'status',
        resourceParams.status != null && resourceParams.status != undefined
          ? resourceParams.status
          : ''
      )
      .set(
        'transactionType',
        resourceParams.transactionType != null &&
          resourceParams.transactionType != undefined
          ? resourceParams.transactionType
          : ''
      )
      .set('branchId', resourceParams.branchId ? resourceParams.branchId : '')
      .set(
        'fromDate',
        resourceParams.fromDate ? resourceParams.fromDate.toISOString() : ''
      )
      .set(
        'toDate',
        resourceParams.toDate ? resourceParams.toDate.toISOString() : ''
      );
    return this.http.get<Transaction[]>(url, {
      params: customParams,
      observe: 'response',
    });
  }

  getTransactionItems(transactionId: string): Observable<TransactionItem[]> {
    const url = `TransactionItem/${transactionId}`;
    return this.http.get<TransactionItem[]>(url);

  }
}
