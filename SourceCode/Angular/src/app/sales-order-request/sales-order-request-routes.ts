import { Routes } from '@angular/router';
import { SalesOrderRequestListComponent } from './sales-order-request-list/sales-order-request-list.component';
import { AuthGuard } from '@core/security/auth.guard';
import { SalesOrderRequestAddEditComponent } from './sales-order-request-add-edit/sales-order-request-add-edit.component';
import { ProductType } from '@core/domain-classes/product-resource-parameter';
import { salesOrderUnitResolver } from '../sales-order/sales-order-add-edit/sales-order-unit-resolver';
import { salesOrderTaxResolver } from '../sales-order/sales-order-add-edit/sales-order-tax-resolver';
import { salesOrderDetailResolver } from '../sales-order/sales-order-add-edit/sales-order-detail-resolver';

export const SALES_ORDER_REQUEST_ROUTES: Routes = [
  {
    path: 'list',
    component: SalesOrderRequestListComponent,
    data: { claimType: 'SOR_VIEW_SO_REQUESTS' },
    canActivate: [AuthGuard],
  },
  {
    path: ':id',
    component: SalesOrderRequestAddEditComponent,
    data: {
      claimType: ['SOR_ADD_SO_REQUEST', 'SOR_UPDATE_SO_REQUEST'],
      productType: ProductType.VariantProduct,
    },
    canActivate: [AuthGuard],
    resolve: {
      units: salesOrderUnitResolver,
      taxs: salesOrderTaxResolver,
      salesorder: salesOrderDetailResolver
    },
  }
];

