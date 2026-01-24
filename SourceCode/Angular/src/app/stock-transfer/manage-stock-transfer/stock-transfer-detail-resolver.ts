import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, Router } from '@angular/router';
import { StockTransfer } from '@core/domain-classes/stockTransfer';
import { StockTransferService } from '../stock-transfer.service';
import { EMPTY, Observable, of } from 'rxjs';
import { take, mergeMap } from 'rxjs/operators';

export const stockTransferDetailResolver: ResolveFn<StockTransfer | null> = (route: ActivatedRouteSnapshot): Observable<StockTransfer | null> => {
  const stockTransferService = inject(StockTransferService);
  const router = inject(Router);
  
  const id = route.paramMap.get('id');
  if (id === 'addItem') {
    return EMPTY;
  }
  
  return stockTransferService.getStockTransfer(id ?? '').pipe(
    take(1),
    mergeMap((stockTransfer: any) => {
      if (stockTransfer) {
        return of(stockTransfer);
      } else {
        router.navigate(['/stockTransfer']);
        return EMPTY;
      }
    })
  );
};
