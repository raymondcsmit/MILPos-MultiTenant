import { Component, input, OnInit } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { TaxItem } from '@core/domain-classes/purchase-sales-order-tax-item';
import { SalesOrder } from '@core/domain-classes/sales-order';
import { SalesOrderItemTax } from '@core/domain-classes/sales-order-item-tax';
import { TranslateModule } from '@ngx-translate/core';
import { BaseComponent } from '../../../../base.component';
import { SalesOrderService } from '../../../../sales-order/sales-order.service';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { MatCardModule } from "@angular/material/card";
import { PageHelpTextComponent } from "@shared/page-help-text/page-help-text.component";
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-out-tax-report-item',
  imports: [
    TranslateModule,
    MatTableModule,
    CustomCurrencyPipe,
    MatCardModule,
    PageHelpTextComponent,
    NgClass
  ],
  templateUrl: './out-tax-report-item.component.html',
  styleUrl: './out-tax-report-item.component.scss'
})
export class OutTaxReportItemComponent extends BaseComponent implements OnInit {
  salesOrder = input.required<SalesOrder>();
  salesOrderTaxItems: SalesOrderItemTax[] = [];
  displayedColumns: string[] = ['name', 'totalAmount'];

  constructor(
    private salesOrderService: SalesOrderService) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.getSalesOrderItems();
  }

  getSalesOrderItems() {
    this.salesOrderService.getSalesOrderTaxItems(this.salesOrder().id ?? '')
      .subscribe((data: TaxItem[]) => {
        this.salesOrderTaxItems = data;
      })
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.salesOrderTaxItems.indexOf(row);
  }
}
