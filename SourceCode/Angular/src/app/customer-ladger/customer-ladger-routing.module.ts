import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@core/security/auth.guard';
import { CustomerLadgerList } from './customer-ladger-list/customer-ladger-list';
import { ManageCustomerLadger } from './manage-customer-ladger/manage-customer-ladger';

const routes: Routes = [
  {
    path: 'list',
    component: CustomerLadgerList,
    canActivate: [AuthGuard]
  },
  {
    path: 'add',
    component: ManageCustomerLadger,
    canActivate: [AuthGuard]
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CustomerLadgerRoutingModule { }
