import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { TableSettingsStore } from '../table-setting/table-setting-store';

export const ProductGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const router = inject(Router);
  const tableSettingsStore = inject(TableSettingsStore);
  tableSettingsStore.loadTableSettingByScreenName("Products");
  return true;
};
