import { Routes } from '@angular/router';
import { StockTransferListComponent } from './stock-transfer-list/stock-transfer-list.component';
import { ManageStockTransferComponent } from './manage-stock-transfer/manage-stock-transfer.component';
import { stockTransferDetailResolver } from './manage-stock-transfer/stock-transfer-detail-resolver';
import { ProductType } from '@core/domain-classes/product-resource-parameter';
import { AuthGuard } from '@core/security/auth.guard';
import { salesOrderUnitResolver } from '../sales-order/sales-order-add-edit/sales-order-unit-resolver';

export const STOCK_TRANSFER_ROUTES: Routes = [
  {
    path: 'list',
    component: StockTransferListComponent,
    data: { claimType: 'STTFR_VIEW_STTFR' },
    canActivate: [AuthGuard]
  },
  {
    path: 'add',
    component: ManageStockTransferComponent,
    resolve: {
      units: salesOrderUnitResolver,
    },
    data: {
      productType: ProductType.VariantProduct,
      claimType: 'STTFR_MANAGE_STTFR'
    },
    canActivate: [AuthGuard]
  },
  {
    path: 'manage/:id',
    component: ManageStockTransferComponent,
    resolve: {
      stockTransfer: stockTransferDetailResolver,
      units: salesOrderUnitResolver,
    },
    data: {
      productType: ProductType.VariantProduct,
      claimType: 'STTFR_MANAGE_STTFR'
    },
    canActivate: [AuthGuard]
  },
];


