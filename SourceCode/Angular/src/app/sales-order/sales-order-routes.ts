import { Routes } from '@angular/router';
import { SalesOrderListComponent } from './sales-order-list/sales-order-list.component';
import { SalesOrderAddEditComponent } from './sales-order-add-edit/sales-order-add-edit.component';
import { AuthGuard } from '@core/security/auth.guard';
import { salesOrderDetailResolver } from './sales-order-add-edit/sales-order-detail-resolver';
import { salesOrderUnitResolver } from './sales-order-add-edit/sales-order-unit-resolver';
import { salesOrderTaxResolver } from './sales-order-add-edit/sales-order-tax-resolver';
import { SalesOrderDetailComponent } from './sales-order-detail/sales-order-detail.component';
import { ProductType } from '@core/domain-classes/product-resource-parameter';
import { SaleOrderGuard } from './sale-order-gaurd';

export const SALE_RODER_ROUTES: Routes = [
  {
    path: 'list',
    component: SalesOrderListComponent,
    data: { claimType: 'SO_VIEW_SALES_ORDERS' },
    canActivate: [AuthGuard, SaleOrderGuard],
  },
  {
    path: ':id',
    component: SalesOrderAddEditComponent,
    data: {
      claimType: ['SO_ADD_SO', 'SO_UPDATE_SO', 'SOR_CONVERT_TO_SO'],
      productType: ProductType.VariantProduct,
    },
    canActivate: [AuthGuard],
    resolve: {
      units: salesOrderUnitResolver,
      taxs: salesOrderTaxResolver,
      salesorder: salesOrderDetailResolver
    },
  },
  {
    path: 'detail/:id',
    component: SalesOrderDetailComponent,
    data: {
      claimType: [
        'SO_VIEW_SO_DETAIL',
        'REP_SO_REP',
        'REP_PRO_SO_REPORT',
        'REP_STOCK_REPORT',
        'REP_SO_PAYMENT_REP',
        'SO_RETURN_SO',
        'SOR_SOR_DETAIL'
      ]
    },
    canActivate: [AuthGuard],
    resolve: {
      salesorder: salesOrderDetailResolver,
    }
  },
];
