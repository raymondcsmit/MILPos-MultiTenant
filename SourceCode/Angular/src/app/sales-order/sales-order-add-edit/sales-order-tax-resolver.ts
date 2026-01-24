import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { Tax } from '@core/domain-classes/tax';
import { TaxService } from '@core/services/tax.service';
import { Observable } from 'rxjs';

export const salesOrderTaxResolver: ResolveFn<Tax[]> = (): Observable<Tax[]> => {
  const taxService = inject(TaxService);
  
  return taxService.getAll();
};
