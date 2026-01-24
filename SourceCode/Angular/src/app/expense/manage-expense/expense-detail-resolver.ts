import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, Router } from '@angular/router';
import { ExpenseService } from '../expense.service';
import { Expense } from '@core/domain-classes/expense';
import { EMPTY, of, take, mergeMap } from 'rxjs';

export const ExpenseDetailResolver: ResolveFn<Expense | null> = (route: ActivatedRouteSnapshot) => {
  const expenseService = inject(ExpenseService);
  const router = inject(Router);
  
  const id = route.paramMap.get('id');
  if (id === 'addItem') {
    return of(null);
  }
  
  return expenseService.getExpense(id ?? '').pipe(
    take(1),
    mergeMap((expense: Expense) => {
      if (expense) {
        return of(expense);
      } else {
        router.navigate(['/expense']);
        return EMPTY;
      }
    })
  );
};
