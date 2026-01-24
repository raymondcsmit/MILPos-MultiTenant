import { Component, Inject, OnInit } from '@angular/core';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { SalesOrder } from '@core/domain-classes/sales-order';
import { SalesOrderPayment } from '@core/domain-classes/sales-order-payment';
import { ToastrService } from '@core/services/toastr.service';
import { SalesOrderPaymentService } from '../sales-order-payment.service';
import { AddSalesOrderPaymentComponent } from '../add-sales-order-payment/add-sales-order-payment.component';
import { PaymentStatusEnum } from '@core/domain-classes/paymentaStatus';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { PaymentMethodPipe } from '@shared/pipes/payment-method.pipe';
import { BaseComponent } from '../../base.component';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-view-sales-order-payment',
  templateUrl: './view-sales-order-payment.component.html',
  styleUrls: ['./view-sales-order-payment.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatIconModule,
    MatTableModule,
    HasClaimDirective,
    UTCToLocalTime,
    CustomCurrencyPipe,
    PaymentMethodPipe,
    MatCardModule,
    MatButtonModule,
    MatDialogModule,
    NgClass
  ]
})
export class ViewSalesOrderPaymentComponent
  extends BaseComponent
  implements OnInit {
  dataSource: SalesOrderPayment[] = [];
  isChanged = false;
  constructor(
    public dialogRef: MatDialogRef<ViewSalesOrderPaymentComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SalesOrder,
    private salesOrderPaymentService: SalesOrderPaymentService,
    private toastrService: ToastrService,
    private commonDialogService: CommonDialogService,
    private dialog: MatDialog
  ) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    if (this.data.id) {
      this.getAllSalesOrderPaymentById();
    }
  }

  displayedColumns: string[] = [
    'action',
    'paymentDate',
    'referenceNumber',
    'amount',
    'paymentMethod',
  ];
  footerToDisplayed = ['footer'];

  onCancel(): void {
    this.dialogRef.close(this.isChanged);
  }

  addPayment(): void {
    const dialogRef = this.dialog.open(AddSalesOrderPaymentComponent, {
      width: '100vh',
      data: Object.assign({}, this.data),
    });
    dialogRef.afterClosed().subscribe((isAdded: boolean) => {
      if (isAdded) {
        this.isChanged = true;
        this.getAllSalesOrderPaymentById();
      }
    });
  }

  getAllSalesOrderPaymentById() {
    this.salesOrderPaymentService
      .getAllSalesOrderPaymentById(this.data.id ?? '')
      .subscribe((data: SalesOrderPayment[]) => {
        this.dataSource = data;
        let sum = data.reduce((sum, current) => sum + current.amount, 0);
        this.data.totalPaidAmount = sum;
        if (this.data.totalAmount <= sum) {
          this.data.paymentStatus = PaymentStatusEnum.Paid;
        } else if (sum > 0) {
          this.data.paymentStatus = PaymentStatusEnum.Partial;
        } else {
          this.data.paymentStatus = PaymentStatusEnum.Pending;
        }
      });
  }

  deletePayment(payment: SalesOrderPayment) {
    this.sub$.sink = this.commonDialogService
      .deleteConformationDialog(
        `${this.translationService.getValue(
          'ARE_YOU_SURE_YOU_WANT_TO_DELETE'
        )} ${payment.amount}`
      )
      .subscribe((isTrue: boolean) => {
        if (isTrue) {
          this.sub$.sink = this.salesOrderPaymentService
            .deleteSalesOrderPayment(payment?.id ?? '')
            .subscribe(() => {
              this.isChanged = true;
              this.toastrService.success(
                this.translationService.getValue('PAYMENT_IS_DELETED')
              );
              this.getAllSalesOrderPaymentById();
            });
        }
      });
  }

  isOddDataRow(index: number): boolean {
    return index % 2 !== 0;
  }

  getDataIndex(row: SalesOrderPayment): number {
    return this.dataSource.indexOf(row);
  }
}
