import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { TableSettingsStore } from '../table-setting/table-setting-store';

export const SaleOrderGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const router = inject(Router);
  const tableSettingsStore = inject(TableSettingsStore);
  tableSettingsStore.loadTableSettingByScreenName("SaleOrders");
  return true;
};
