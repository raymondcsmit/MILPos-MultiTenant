import { Injectable } from '@angular/core';
import { HttpParams, HttpClient, HttpResponse, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ExpenseResourceParameter } from '@core/domain-classes/expense-source-parameter';
import { Expense } from '@core/domain-classes/expense';
import { TaxItem } from '@core/domain-classes/purchase-sales-order-tax-item';

@Injectable({
  providedIn: 'root',
})
export class ExpenseService {
  constructor(private httpClient: HttpClient) { }

  getExpenses(
    resourceParams: ExpenseResourceParameter
  ): Observable<HttpResponse<Expense[]>> {
    const url = 'expense';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields ? resourceParams.fields : '')
      .set('orderBy', resourceParams.orderBy ? resourceParams.orderBy : '')
      .set('pageSize', resourceParams.pageSize.toString())
      .set('skip', resourceParams.skip.toString())
      .set('searchQuery', resourceParams.searchQuery ? resourceParams.searchQuery : '')
      .set('description', resourceParams.description ? resourceParams.description : '')
      .set('expenseCategoryId', resourceParams.expenseCategoryId ? resourceParams.expenseCategoryId : '')
      .set('reference', resourceParams.reference ? resourceParams.reference : '')
      .set('expenseById', resourceParams.expenseById ? resourceParams.expenseById : '')
      .set('fromDate', resourceParams.fromDate ? resourceParams.fromDate.toISOString() : '')
      .set('toDate', resourceParams.toDate ? resourceParams.toDate.toISOString() : '')
      .set('locationId', resourceParams.locationId ? resourceParams.locationId : '');
    return this.httpClient.get<Expense[]>(url, {
      params: customParams,
      observe: 'response',
    });
  }

  getExpensesReport(
    resourceParams: ExpenseResourceParameter
  ): Observable<HttpResponse<Expense[]>> {
    const url = 'expense';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields ? resourceParams.fields : '')
      .set('orderBy', resourceParams.orderBy ? resourceParams.orderBy : '')
      .set('pageSize', "0")
      .set('skip', "0")
      .set('searchQuery', resourceParams.searchQuery ? resourceParams.searchQuery : '')
      .set('description', resourceParams.description ? resourceParams.description : '')
      .set('expenseCategoryId', resourceParams.expenseCategoryId ? resourceParams.expenseCategoryId : '')
      .set('reference', resourceParams.reference ? resourceParams.reference : '')
      .set('expenseById', resourceParams.expenseById ? resourceParams.expenseById : '')
      .set('fromDate', resourceParams.fromDate ? resourceParams.fromDate.toISOString() : '')
      .set('toDate', resourceParams.toDate ? resourceParams.toDate.toISOString() : '')
      .set('locationId', resourceParams.locationId ? resourceParams.locationId : '');
    return this.httpClient.get<Expense[]>(url, {
      params: customParams,
      observe: 'response',
    });
  }


  getExpense(id: string): Observable<Expense> {
    const url = 'expense/' + id;
    return this.httpClient.get<Expense>(url);
  }

  deleteExpense(id: string): Observable<void> {
    const url = `expense/${id}`;
    return this.httpClient.delete<void>(url);
  }

  updateExpense(id: string, expense: Expense): Observable<Expense> {
    const url = 'expense/' + id;
    return this.httpClient.put<Expense>(url, expense);
  }

  addExpense(expense: Expense): Observable<Expense> {
    const url = 'expense';
    return this.httpClient.post<Expense>(url, expense);
  }

  downloadReceipt(id: string): Observable<HttpEvent<Blob>> {
    const url = `expense/${id}/download`;
    return this.httpClient.get(url, {
      reportProgress: true,
      observe: 'events',
      responseType: 'blob',
    });
  }

  getExpenseTaxItems(
    expenseId: string
  ): Observable<TaxItem[]> {
    const url = `expense/${expenseId}/tax-item`;
    return this.httpClient.get<TaxItem[]>(url);
  }

  getTotalByTaxForExpense(
    resourceParams: ExpenseResourceParameter
  ): Observable<TaxItem[]> {
    const url = 'expense/tax-total';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields ? resourceParams.fields : '')
      .set('orderBy', resourceParams.orderBy ? resourceParams.orderBy : '')
      .set('pageSize', resourceParams.pageSize.toString())
      .set('skip', resourceParams.skip.toString())
      .set('searchQuery', resourceParams.searchQuery ? resourceParams.searchQuery : '')
      .set('description', resourceParams.description ? resourceParams.description : '')
      .set('expenseCategoryId', resourceParams.expenseCategoryId ? resourceParams.expenseCategoryId : '')
      .set('reference', resourceParams.reference ? resourceParams.reference : '')
      .set('expenseById', resourceParams.expenseById ? resourceParams.expenseById : '')
      .set('fromDate', resourceParams.fromDate ? resourceParams.fromDate.toISOString() : '')
      .set('toDate', resourceParams.toDate ? resourceParams.toDate.toISOString() : '')
      .set('locationId', resourceParams.locationId ? resourceParams.locationId : '');
    return this.httpClient.get<TaxItem[]>(url, {
      params: customParams
    });
  }

}
