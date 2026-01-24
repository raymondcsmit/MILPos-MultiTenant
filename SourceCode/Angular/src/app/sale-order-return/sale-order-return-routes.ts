import { Routes } from '@angular/router';
import { AuthGuard } from '@core/security/auth.guard';
import { salesOrderTaxResolver } from '../sales-order/sales-order-add-edit/sales-order-tax-resolver';
import { salesOrderUnitResolver } from '../sales-order/sales-order-add-edit/sales-order-unit-resolver';
import { salesOrderDetailResolver } from '../sales-order/sales-order-add-edit/sales-order-detail-resolver';
import { SaleOrderReturnListComponent } from './sale-order-return-list/sale-order-return-list.component';
import { SaleOrderReturnComponent } from './sale-order-return/sale-order-return.component';
import { ProductType } from '@core/domain-classes/product-resource-parameter';
import { ProductsResolver } from '../product/product-resolver';

export const SALE_ORDER_RETURN_ROUTES: Routes = [
  {
    path: 'list',
    component: SaleOrderReturnListComponent,
    data: { claimType: 'SO_RETURN_SO' },
    canActivate: [AuthGuard],
  },
  {
    path: 'add',
    component: SaleOrderReturnComponent,
    data: {
      claimType: 'SO_RETURN_SO',
      productType: ProductType.VariantProduct,
    },
    canActivate: [AuthGuard],
    resolve: {
      units: salesOrderUnitResolver,
      taxs: salesOrderTaxResolver,
      products: ProductsResolver,
    },
  },
  {
    path: ':id',
    component: SaleOrderReturnComponent,
    data: {
      claimType: 'SO_RETURN_SO',
      productType: ProductType.VariantProduct,
    },
    canActivate: [AuthGuard],
    resolve: {
      units: salesOrderUnitResolver,
      taxs: salesOrderTaxResolver,
      salesorder: salesOrderDetailResolver,
      products: ProductsResolver,
    },
  },
];

