import { Component, input, OnInit } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';
import { PurchaseOrderItemTax } from '@core/domain-classes/purchase-order-item-tax';
import { TaxItem } from '@core/domain-classes/purchase-sales-order-tax-item';
import { TranslateModule } from '@ngx-translate/core';
import { BaseComponent } from '../../../../base.component';
import { PurchaseOrderService } from '../../../../purchase-order/purchase-order.service';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { MatCardModule } from "@angular/material/card";
import { PageHelpTextComponent } from "@shared/page-help-text/page-help-text.component";
import { NgClass } from '@angular/common';
@Component({
  selector: 'app-input-tax-report-item',
  imports: [
    MatTableModule,
    TranslateModule,
    CustomCurrencyPipe,
    MatCardModule,
    PageHelpTextComponent,
    NgClass
  ],
  templateUrl: './input-tax-report-item.component.html',
  styleUrl: './input-tax-report-item.component.scss'
})
export class InputTaxReportItemComponent extends BaseComponent implements OnInit {
  purchaseOrder = input.required<PurchaseOrder>();
  purchaseOrderTaxItems: PurchaseOrderItemTax[] = [];
  displayedColumns: string[] = ['name', 'totalAmount'];

  constructor(private purchaseOrderService: PurchaseOrderService) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.getPurchaseOrderItems();
  }

  getPurchaseOrderItems() {
    const purchaseOrder = this.purchaseOrder();
    this.purchaseOrderService.getPurchaseOrderTaxItems(purchaseOrder.id ?? '')
      .subscribe((data: TaxItem[]) => {
        this.purchaseOrderTaxItems = data;
      })
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.purchaseOrderTaxItems.indexOf(row);
  }
}
