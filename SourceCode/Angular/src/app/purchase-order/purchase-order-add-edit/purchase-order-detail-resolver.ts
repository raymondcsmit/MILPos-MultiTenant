import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';
import { Observable } from 'rxjs';
import { PurchaseOrderService } from '../purchase-order.service';

export const purchaseOrderDetailResolver: ResolveFn<PurchaseOrder | null> = (route: ActivatedRouteSnapshot): Observable<PurchaseOrder> | null => {
  const purchaseOrderService = inject(PurchaseOrderService);
  
  const id = route.paramMap.get('id');
  if (id === 'add') {
    return null;
  }
  
  return purchaseOrderService.getPurchaseOrderById(id ?? '');
};
