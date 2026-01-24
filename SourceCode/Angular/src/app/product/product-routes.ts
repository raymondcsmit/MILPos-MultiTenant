import { Routes } from '@angular/router';
import { AuthGuard } from '@core/security/auth.guard';
import { ManageProductComponent } from './manage-product/manage-product.component';
import { productDetailResolver } from './manage-product/product-detail-resolver';
import { ProductListComponent } from './product-list/product-list.component';
import { ProductGuard } from './product-guard';

export const PRODUCT_ROUTES: Routes = [
  {
    path: '',
    component: ProductListComponent,
    data: { claimType: 'PRO_VIEW_PRODUCTS' },
    canActivate: [AuthGuard, ProductGuard]
  }, {
    path: 'add',
    component: ManageProductComponent,
    data: { claimType: 'PRO_ADD_PRODUCT' },
    canActivate: [AuthGuard]
  },
  {
    path: 'manage/:id',
    component: ManageProductComponent,
    resolve: {
      product: productDetailResolver,
    },
    data: { claimType: 'PRO_UPDATE_PRODUCT' },
    canActivate: [AuthGuard]
  }
];


