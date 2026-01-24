import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { Observable } from 'rxjs';
import { FinancialYear } from './financial-year';
import { FinancialYearService } from './financial-year.service';

export const FinancialYearResolver: ResolveFn<FinancialYear | undefined> = (
  route,
  ActivatedRouteSnapshot
) => {
  const financialYearService = inject(FinancialYearService);
  const id = route.params['id'];
  if (id != null) {
    return financialYearService.getFinancialYear(id) as Observable<FinancialYear>;
  }
  return;
};
