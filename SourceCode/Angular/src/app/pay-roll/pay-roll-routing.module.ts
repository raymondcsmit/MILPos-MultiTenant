import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@core/security/auth.guard';
import { PayRollList } from './pay-roll-list/pay-roll-list';
import { ManagePayRoll } from './manage-pay-roll/manage-pay-roll';

const routes: Routes = [
  {
    path: 'list',
    component: PayRollList,
    data: { claimType: 'PAY_ROLL_VIEW_PAY_ROLLS' },
    canActivate: [AuthGuard]
  },
  {
    path: 'add',
    component: ManagePayRoll,
    data: { claimType: 'PAY_ROLL_MANAGE_PAY_ROLL' },
    canActivate: [AuthGuard]
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PayRollRoutingModule { }
