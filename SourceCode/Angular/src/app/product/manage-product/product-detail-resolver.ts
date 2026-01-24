import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, Router } from '@angular/router';
import { Product } from '@core/domain-classes/product';
import { EMPTY, Observable, of } from 'rxjs';
import { take, mergeMap } from 'rxjs/operators';
import { ProductService } from '../product.service';

export const productDetailResolver: ResolveFn<Product | null> = (route: ActivatedRouteSnapshot): Observable<Product | null> => {
  const productService = inject(ProductService);
  const router = inject(Router);
  
  const id = route.paramMap.get('id');
  if (id === 'add') {
    return EMPTY;
  }
  
  return productService.getProudct(id ?? '').pipe(
    take(1),
    mergeMap((product) => {
      if (product) {
        return of(product);
      } else {
        router.navigate(['/products']);
        return EMPTY;
      }
    })
  );
};
