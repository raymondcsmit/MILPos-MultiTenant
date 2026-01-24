import { Component, input, Input, OnInit, SimpleChanges } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { SalesOrder } from '@core/domain-classes/sales-order';
import { SalesOrderItem } from '@core/domain-classes/sales-order-item';
import { TranslateModule } from '@ngx-translate/core';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { BaseComponent } from '../../base.component';
import { SalesOrderService } from '../../sales-order/sales-order.service';
import { MatCardModule } from '@angular/material/card';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-sale-order-return-item',
  templateUrl: './sale-order-return-item.component.html',
  styleUrls: ['./sale-order-return-item.component.scss'],
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
export class SaleOrderReturnItemComponent extends BaseComponent implements OnInit {
  salesOrder = input.required<SalesOrder>();
  salesOrderItems: SalesOrderItem[] = [];
  displayedColumns: string[] = ['productName', 'source', 'unitName', 'unitPrice', 'quantity', 'totalDiscount', 'taxes', 'totalTax', 'totalAmount'];

  constructor(private salesOrderService: SalesOrderService) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.getSalesOrderItems();
  }



  getSalesOrderItems() {
    this.salesOrderService.getSalesOrderItems(this.salesOrder().id ?? '', true)
      .subscribe((data: SalesOrderItem[]) => {
        this.salesOrderItems = data;
      })
  }

  getDataIndex(row: SalesOrderItem): number {
    return this.salesOrderItems.indexOf(row);
  }

  isOddDataRow(index: number): boolean {
    return index % 2 !== 0;
  }
}
