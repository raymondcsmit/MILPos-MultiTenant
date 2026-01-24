import { Component, OnInit } from '@angular/core';
import { PurchaseOrderRecentDeliverySchedule } from '@core/domain-classes/purchase-order-recent-delivery-schedule';
import { DashboardService } from '../dashboard.service';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { BaseComponent } from '../../base.component';
import { MatCardModule } from '@angular/material/card';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-purchase-order-expected-delivery',
  templateUrl: './purchase-order-expected-delivery.component.html',
  styleUrls: ['./purchase-order-expected-delivery.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatTableModule,
    RouterModule,
    UTCToLocalTime,
    MatCardModule,
    NgClass
  ]
})
export class PurchaseOrderExpectedDeliveryComponent
  extends BaseComponent
  implements OnInit {
  displayedColumns: string[] = [
    'Order_Number',
    'Supplier_Name',
    'ExpectedDispatchDate',
    'Quantity',
  ];
  dataSource: PurchaseOrderRecentDeliverySchedule[] = [];
  loading: boolean = false;
  constructor(
    private dashboardService: DashboardService
  ) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.getSalesOrderRecentShipmentOrder();
  }

  getSalesOrderRecentShipmentOrder() {
    this.loading = true;
    this.dashboardService.getPurchaseOrderRecentDeliverySchedule().subscribe(
      (c) => {
        this.loading = false;
        this.dataSource = c;
      },
      (err) => (this.loading = false)
    );
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM  
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.dataSource.indexOf(row);
  }
}
