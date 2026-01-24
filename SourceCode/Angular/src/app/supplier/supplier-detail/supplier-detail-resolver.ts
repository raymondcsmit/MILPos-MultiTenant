import { ActivatedRouteSnapshot, ResolveFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { of } from 'rxjs';
import { take, mergeMap } from 'rxjs/operators';
import { Supplier } from '@core/domain-classes/supplier';
import { SupplierService } from '../supplier.service';

export const supplierDetailResolver: ResolveFn<Supplier | null> = (route: ActivatedRouteSnapshot) => {
  const supplierService = inject(SupplierService);
  const router = inject(Router);

  const id = route.paramMap.get('id');
  if (id === 'addItem') {
    return of(null);
  }

  return supplierService.getSupplier(id ?? '').pipe(
    take(1),
    mergeMap(supplier => {
      if (supplier) {
        return of(supplier);
      } else {
        router.navigate(['/supplier']);
        return of(null);
      }
    })
  );
};
