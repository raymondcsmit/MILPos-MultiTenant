import { Routes } from "@angular/router";
import { AuthGuard } from "@core/security/auth.guard";
import { purchaseOrderDetailResolver } from "../purchase-order/purchase-order-add-edit/purchase-order-detail-resolver";
import { purchaseOrderTaxResolver } from "../purchase-order/purchase-order-add-edit/purchase-order-tax-resolver";
import { purchaseOrderUnitResolver } from "../purchase-order/purchase-order-add-edit/purchase-order-unit-resolver";
import { PurchaseOrderReturnListComponent } from "./purchase-order-return-list/purchase-order-return-list.component";
import { PurchaseOrderReturnComponent } from "./purchase-order-return/purchase-order-return.component";
import { ProductsResolver } from "../product/product-resolver";

export const PURCHASE_ORDER_RETURNS_ROUTES: Routes = [
  {
    path: 'list',
    component: PurchaseOrderReturnListComponent,
    data: { claimType: 'PO_RETURN_PO' },
    canActivate: [AuthGuard]
  }, {
    path: 'add',
    component: PurchaseOrderReturnComponent,
    data: { claimType: 'PO_RETURN_PO' },
    canActivate: [AuthGuard],
    resolve: {
      'units': purchaseOrderUnitResolver,
      'taxs': purchaseOrderTaxResolver,
      'products': ProductsResolver
    }
  }, {
    path: ':id',
    component: PurchaseOrderReturnComponent,
    data: { claimType: 'PO_RETURN_PO' },
    canActivate: [AuthGuard],
    resolve: {
      'units': purchaseOrderUnitResolver,
      'taxs': purchaseOrderTaxResolver,
      'purchaseorder': purchaseOrderDetailResolver,
      'products': ProductsResolver
    }
  },

];

