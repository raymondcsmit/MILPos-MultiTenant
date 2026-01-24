import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, Router } from '@angular/router';
import { CustomerService } from './customer.service';
import { Customer } from '@core/domain-classes/customer';
import { of, EMPTY } from 'rxjs';
import { take, mergeMap } from 'rxjs/operators';

export const CustomerDetailResolver: ResolveFn<Customer | null> = (route: ActivatedRouteSnapshot) => {
  const customerService = inject(CustomerService);
  const router = inject(Router);

  const id = route.paramMap.get('id');
  if (id === 'addItem') {
    return of(null);
  }
  return customerService.getCustomer(id ?? '').pipe(
    take(1),
    mergeMap((customer) => {
      if (customer) {
        return of(customer);
      } else {
        router.navigate(['/customer']);
        return EMPTY;
      }
    })
  );
};
