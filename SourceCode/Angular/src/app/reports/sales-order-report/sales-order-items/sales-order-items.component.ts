import { Component, input, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { SalesOrder } from '@core/domain-classes/sales-order';
import { SalesOrderItem } from '@core/domain-classes/sales-order-item';
import { TranslateModule } from '@ngx-translate/core';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { BaseComponent } from '../../../base.component';
import { SalesOrderService } from '../../../sales-order/sales-order.service';
import { MatCardModule } from "@angular/material/card";
import { NgClass } from '@angular/common';


@Component({
  selector: 'app-sales-order-items',
  templateUrl: './sales-order-items.component.html',
  styleUrls: ['./sales-order-items.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatTableModule,
    CustomCurrencyPipe,
    MatCardModule,
    NgClass
  ]
})
export class SalesOrderItemsComponent extends BaseComponent implements OnInit, OnChanges {
  salesOrder = input.required<SalesOrder>();
  salesOrderItems: SalesOrderItem[] = [];
  displayedColumns: string[] = ['productName', 'source', 'unitName', 'unitPrice', 'quantity', 'totalDiscount', 'taxes', 'totalTax', 'totalAmount'];

  constructor(private salesOrderService: SalesOrderService) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['salesOrder']) {
      this.getSalesOrderItems();
    }
  }

  getSalesOrderItems() {
    const salesOrder = this.salesOrder();
    this.salesOrderService.getSalesOrderItems(salesOrder.id ?? '')
      .subscribe((data: SalesOrderItem[]) => {
        this.salesOrderItems = data;
      })
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.salesOrderItems.indexOf(row);
  }
}
