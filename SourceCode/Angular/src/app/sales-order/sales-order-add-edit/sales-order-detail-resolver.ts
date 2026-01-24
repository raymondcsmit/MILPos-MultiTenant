import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { SalesOrder } from '@core/domain-classes/sales-order';
import { SalesOrderService } from '../sales-order.service';
import { Observable } from 'rxjs';

export const salesOrderDetailResolver: ResolveFn<SalesOrder | null> = (route: ActivatedRouteSnapshot): Observable<SalesOrder> | null => {
  const salesOrderService = inject(SalesOrderService);
  
  const id = route.paramMap.get('id');
  if (id === 'add') {
    return null;
  }
  
  return salesOrderService.getSalesOrderById(id ?? '');
};
