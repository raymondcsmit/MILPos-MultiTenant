
import { ProductType } from '@core/domain-classes/product-resource-parameter';
import { AuthGuard } from '@core/security/auth.guard';
import { DamagedStockListComponent } from './damaged-stock-list/damaged-stock-list.component';
import { ManageDamagedStockComponent } from './manage-damaged-stock/manage-damaged-stock.component';
import { Routes } from '@angular/router';
import { salesOrderUnitResolver } from '../sales-order/sales-order-add-edit/sales-order-unit-resolver';

export const DAMAGED_STOCK_ROUTES: Routes = [
  {
    path: 'list',
    component: DamagedStockListComponent,
    data: { claimType: 'DMG_ST_VIEW_DMG_ST' },
    canActivate: [AuthGuard]
  },
  {
    path: 'add',
    component: ManageDamagedStockComponent,
    resolve: {
      units: salesOrderUnitResolver,
    },
    data: {
      productType: ProductType.VariantProduct,
      claimType: 'DMG_ST_MANAGE_DMG_ST'
    },
    canActivate: [AuthGuard]
  },
];


