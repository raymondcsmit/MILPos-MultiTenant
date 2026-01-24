import { Component, input, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';
import { PurchaseOrderItem } from '@core/domain-classes/purchase-order-item';
import { PurchaseOrderService } from '../purchase-order.service';
import { TranslateModule } from '@ngx-translate/core';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { MatTableModule } from '@angular/material/table';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { BaseComponent } from '../../base.component';
import { MatCardModule } from '@angular/material/card';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-purchase-order-item',
  templateUrl: './purchase-order-item.component.html',
  styleUrls: ['./purchase-order-item.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    PageHelpTextComponent,
    MatTableModule,
    CustomCurrencyPipe,
    MatCardModule,
    NgClass
  ]
})
export class PurchaseOrderItemComponent extends BaseComponent implements OnInit, OnChanges {
  purchaseOrder = input.required<PurchaseOrder>();
  purchaseOrderItems: PurchaseOrderItem[] = [];
  displayedColumns: string[] = ['productName', 'source', 'unitName', 'unitPrice', 'quantity', 'totalDiscount', 'taxes', 'totalTax', 'totalAmount'];

  constructor(private purchaseOrderService: PurchaseOrderService) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['purchaseOrder']) {
      this.getPurchaseOrderItems();
    }
  }

  getPurchaseOrderItems() {
    const purchaseOrder = this.purchaseOrder()
    this.purchaseOrderService.getPurchaseOrderItems(purchaseOrder?.id ?? '')
      .subscribe((data: PurchaseOrderItem[]) => {
        this.purchaseOrderItems = data;
      })
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.purchaseOrderItems.indexOf(row);
  }
}
