import { AuthGuard } from '@core/security/auth.guard';
import { purchaseOrderDetailResolver } from '../purchase-order/purchase-order-add-edit/purchase-order-detail-resolver';
import { purchaseOrderTaxResolver } from '../purchase-order/purchase-order-add-edit/purchase-order-tax-resolver';
import { purchaseOrderUnitResolver } from '../purchase-order/purchase-order-add-edit/purchase-order-unit-resolver';
import { PurchaseOrderRequestAddEditComponent } from './purchase-order-request-add-edit/purchase-order-request-add-edit.component';
import { PurchaseOrderRequestListComponent } from './purchase-order-request-list/purchase-order-request-list.component';
import { Routes } from '@angular/router';

export const PURCHASE_ORDER_REQUEST_ROUTES: Routes = [
  {
    path: 'list',
    component: PurchaseOrderRequestListComponent,
    data: { claimType: 'POR_VIEW_PO_REQUESTS' },
    canActivate: [AuthGuard]
  }, {
    path: ':id',
    component: PurchaseOrderRequestAddEditComponent,
    data: { claimType: ['POR_ADD_PO_REQUEST', 'POR_UPDATE_PO_REQUEST'] },
    canActivate: [AuthGuard],
    resolve: {
      'units': purchaseOrderUnitResolver,
      'taxs': purchaseOrderTaxResolver,
      'purchaseorder': purchaseOrderDetailResolver,
    }
  }
];

