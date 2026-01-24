import { CurrencyPipe, NgClass } from '@angular/common';
import { Component, input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';
import { PurchaseOrderItem } from '@core/domain-classes/purchase-order-item';
import { TranslateModule } from '@ngx-translate/core';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { BaseComponent } from '../../../base.component';
import { PurchaseOrderService } from '../../../purchase-order/purchase-order.service';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-purchase-order-request-items',
  templateUrl: './purchase-order-request-items.component.html',
  styleUrls: ['./purchase-order-request-items.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    MatTableModule,
    CustomCurrencyPipe,
    CurrencyPipe,
    MatCardModule,
    NgClass
  ]
})
export class PurchaseOrderRequestItemsComponent extends BaseComponent implements OnInit, OnChanges {
  purchaseOrder = input.required<PurchaseOrder>();
  purchaseOrderItems: PurchaseOrderItem[] = [];
  displayedColumns: string[] = ['productName', 'unitName', 'unitPrice', 'quantity', 'totalDiscount', 'taxes', 'totalTax', 'totalAmount'];

  constructor(private purchaseOrderService: PurchaseOrderService
  ) {
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
    const purchaseOrder = this.purchaseOrder();
    this.purchaseOrderService.getPurchaseOrderItems(purchaseOrder.id ?? '')
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
