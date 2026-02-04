import { Routes } from '@angular/router';
import { AuthGuard } from '@core/security/auth.guard';
import { DailyPriceManagerComponent } from './daily-price-manager.component';

export const DAILY_PRICE_ROUTES: Routes = [
  {
    path: '',
    component: DailyPriceManagerComponent,
    data: { claimType: 'PRO_MANAGE_DAILY_PRICES' },
    canActivate: [AuthGuard]
  }
];
