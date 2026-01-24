import { Routes } from '@angular/router';
import { AuthGuard } from '@core/security/auth.guard';
import { PurchaseOrderAddEditComponent } from './purchase-order-add-edit/purchase-order-add-edit.component';
import { purchaseOrderDetailResolver } from './purchase-order-add-edit/purchase-order-detail-resolver';
import { purchaseOrderTaxResolver } from './purchase-order-add-edit/purchase-order-tax-resolver';
import { purchaseOrderUnitResolver } from './purchase-order-add-edit/purchase-order-unit-resolver';
import { PurchaseOrderDetailComponent } from './purchase-order-detail/purchase-order-detail.component';
import { PurchaseOrderListComponent } from './purchase-order-list/purchase-order-list.component';
import { PurchaseOrderGuard } from './purchase-order-guard';

export const PURCHASE_ORDER_ROUTES: Routes = [
  {
    path: 'list',
    component: PurchaseOrderListComponent,
    data: { claimType: 'PO_VIEW_PURCHASE_ORDERS' },
    canActivate: [AuthGuard, PurchaseOrderGuard]
  }, {
    path: ':id',
    component: PurchaseOrderAddEditComponent,
    data: { claimType: ['PO_ADD_PO', 'PO_UPDATE_PO', 'POR_CONVERT_TO_PO'] },
    canActivate: [AuthGuard],
    resolve: {
      'units': purchaseOrderUnitResolver,
      'taxs': purchaseOrderTaxResolver,
      'purchaseorder': purchaseOrderDetailResolver,
    }
  },
  {
    path: 'detail/:id',
    component: PurchaseOrderDetailComponent,
    data: {
      claimType: [
        'PO_VIEW_PO_DETAIL',
        'POR_POR_DETAIL',
        'REP_PO_REP',
        'REP_PRO_PP_REP',
        'REP_STOCK_REPORT',
        'REP_PO_PAYMENT_REP',
        'PO_RETURN_PO'
      ]
    },
    canActivate: [AuthGuard],
    resolve: {
      purchaseorder: purchaseOrderDetailResolver,
    }
  }
];

