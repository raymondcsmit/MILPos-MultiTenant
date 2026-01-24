import { Component } from '@angular/core';
import { SalesOrderRecentShipmentDate } from '@core/domain-classes/sales-order-recent-shipment-date';
import { DashboardService } from '../dashboard.service';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { MatTableModule } from '@angular/material/table';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { BaseComponent } from '../../base.component';
import { MatCardModule } from '@angular/material/card';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-sales-order-expected-shipment',
  templateUrl: './sales-order-expected-shipment.component.html',
  styleUrls: ['./sales-order-expected-shipment.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    MatTableModule,
    TranslateModule,
    RouterModule,
    UTCToLocalTime,
    MatCardModule,
    NgClass
  ]
})
export class SalesOrderExpectedShipmentComponent
  extends BaseComponent {
  displayedColumns: string[] = [
    'Order_Number',
    'Customer_Name',
    'Expected_Shipment_Date',
    'Quantity',
  ];
  dataSource: SalesOrderRecentShipmentDate[] = [];
  constructor(
    private dashboardService: DashboardService
  ) {
    super();
    this.getLangDir();
    this.getSalesOrderRecentShipmentOrder();
  }

  getSalesOrderRecentShipmentOrder() {
    this.dashboardService.getSalesOrderRecentShipment().subscribe(
      (c) => {
        this.dataSource = c;
      }
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
