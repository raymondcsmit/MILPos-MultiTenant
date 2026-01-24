import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ExpenseCategory } from '@core/domain-classes/expense-category';
import { filter, Observable, switchMap, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ExpenseCategoryService {

  httpClient = inject(HttpClient);

  getAll(): Observable<ExpenseCategory[]> {
    const url = 'ExpenseCategories';
    return this.httpClient.get<ExpenseCategory[]>(url);
  }

  getById(id: string): Observable<ExpenseCategory> {
    const url = 'ExpenseCategory/' + id;
    return this.httpClient.get<ExpenseCategory>(url);
  }

  delete(id: string): Observable<void> {
    const url = `ExpenseCategory/${id}`;
    return this.httpClient.delete<void>(url);
  }

  update(id: string, expenseCategory: ExpenseCategory): Observable<ExpenseCategory> {
    const url = 'ExpenseCategory/' + id;
    return this.httpClient.put<ExpenseCategory>(url, expenseCategory);
  }

  add(expenseCategory: ExpenseCategory): Observable<ExpenseCategory> {
    const url = 'ExpenseCategory';
    return this.httpClient.post<ExpenseCategory>(url, expenseCategory);
  }

}
