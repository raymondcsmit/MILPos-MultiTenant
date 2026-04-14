import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TenantListComponent } from './tenant-list/tenant-list';
import { TenantRoutingModule } from './tenant-routing-module';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    TenantRoutingModule,
    TenantListComponent
  ]
})
export class TenantModule { }
