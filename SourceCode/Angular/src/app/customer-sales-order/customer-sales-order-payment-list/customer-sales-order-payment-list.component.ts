import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CustomerSalesOrder } from '../customer-sales-order-list/customer-sales-order';
import { CustomerSalesOrderPayment } from './customer-sales-order-payment';
import { CustomerSalesOrderService } from '../customer-sales-order.service';
import { MatTableModule } from '@angular/material/table';
import { BaseComponent } from '../../base.component';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { RouterModule } from '@angular/router';
import { PaymentStatusPipe } from "../../shared/pipes/payment-status.pipe";
import { MatCardModule } from "@angular/material/card";
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-customer-sales-order-payment-list',
  imports: [
    MatTableModule,
    PageHelpTextComponent,
    TranslateModule,
    UTCToLocalTime,
    CustomCurrencyPipe,
    RouterModule,
    PaymentStatusPipe,
    MatCardModule,
    NgClass
  ],
  templateUrl: './customer-sales-order-payment-list.component.html',
  styleUrl: './customer-sales-order-payment-list.component.scss'
})
export class CustomerSalesOrderPaymentListComponent extends BaseComponent
  implements OnInit, OnChanges {
  @Input() customerSalesOrder!: CustomerSalesOrder;
  customerSalesOrderPayments: CustomerSalesOrderPayment[] = [];

  displayedColumns: string[] = [
    'soCreatedDate',
    'orderNumber',
    'totalAmount',
    'totalTax',
    'totalDiscount',
    'totalPaidAmount',
    'remainingAmount',
    'paymentStatus',
  ];

  constructor(private customerSalesOrderService: CustomerSalesOrderService) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['customerSalesOrder']) {
      this.getCustomerSalesOrderPayments();
    }
  }

  getCustomerSalesOrderPayments() {
    this.customerSalesOrderService
      .getCustomerSalesOrderPayments(this.customerSalesOrder.customerId)
      .subscribe((data: CustomerSalesOrderPayment[]) => {
        this.customerSalesOrderPayments = data;
      });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.customerSalesOrderPayments.indexOf(row);
  }
}
