import { Component, input, OnInit } from '@angular/core';
import { SalesOrder } from '@core/domain-classes/sales-order';
import { SalesOrderItem } from '@core/domain-classes/sales-order-item';
import { SalesOrderService } from '../../sales-order.service';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatTableModule } from '@angular/material/table';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { BaseComponent } from '../../../base.component';
import { MatCardModule } from '@angular/material/card';
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
export class SalesOrderItemsComponent extends BaseComponent implements OnInit {
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
    this.salesOrderService.getSalesOrderItems(this.salesOrder().id ?? '')
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
