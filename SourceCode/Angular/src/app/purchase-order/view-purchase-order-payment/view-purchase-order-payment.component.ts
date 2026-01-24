import { Component, Inject, OnInit } from '@angular/core';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
} from '@angular/material/dialog';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';
import { PurchaseOrderPayment } from '@core/domain-classes/purchase-order-payment';
import { ToastrService } from '@core/services/toastr.service';
import { PurchaseOrderPaymentService } from '../purchase-order-payment.service';
import { AddPurchaseOrderPaymentsComponent } from '../add-purchase-order-payments/add-purchase-order-payments.component';
import { PaymentStatusEnum } from '@core/domain-classes/paymentaStatus';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { BaseComponent } from '../../base.component';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { PaymentMethodPipe } from '@shared/pipes/payment-method.pipe';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { PaymentTypePipe } from '@shared/pipes/payment-type.pipe';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-view-purchase-order-payment',
  templateUrl: './view-purchase-order-payment.component.html',
  styleUrls: ['./view-purchase-order-payment.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatIconModule,
    MatTableModule,
    HasClaimDirective,
    MatDialogModule,
    UTCToLocalTime,
    CustomCurrencyPipe,
    PaymentMethodPipe,
    MatCardModule,
    MatButtonModule,
    PaymentTypePipe,
    NgClass
  ]
})
export class ViewPurchaseOrderPaymentComponent
  extends BaseComponent
  implements OnInit {
  dataSource: PurchaseOrderPayment[] = [];
  isChanged = false;
  constructor(
    public dialogRef: MatDialogRef<ViewPurchaseOrderPaymentComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PurchaseOrder,
    private purchaseOrderPaymentService: PurchaseOrderPaymentService,
    private toastrService: ToastrService,
    private commonDialogService: CommonDialogService,
    private dialog: MatDialog
  ) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    if (this.data.id) {
      this.getAllPurchaseOrderPaymentById();
    }
  }

  displayedColumns: string[] = [
    'action',
    'paymentType',
    'paymentDate',
    'amount',
    'paymentMethod',
    'referenceNumber',
  ];
  footerToDisplayed = ['footer'];

  onCancel(): void {
    this.dialogRef.close(this.isChanged);
  }

  getAllPurchaseOrderPaymentById() {
    this.purchaseOrderPaymentService
      .getAllPurchaseOrderPaymentById(this.data.id ?? '')
      .subscribe((data: PurchaseOrderPayment[]) => {
        this.dataSource = data;
        let sum = data.reduce((sum, current) => sum + (current.amount ?? 0), 0);
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

  addPayment() {
    const dialogRef = this.dialog.open(AddPurchaseOrderPaymentsComponent, {
      width: '100vh',
      data: Object.assign({}, this.data),
    });
    dialogRef.afterClosed().subscribe((isAdded: boolean) => {
      if (isAdded) {
        this.isChanged = true;
        this.getAllPurchaseOrderPaymentById();
      }
    });
  }

  deletePayment(payment: PurchaseOrderPayment) {
    this.sub$.sink = this.commonDialogService
      .deleteConformationDialog(
        `${this.translationService.getValue(
          'ARE_YOU_SURE_YOU_WANT_TO_DELETE'
        )} ${payment.amount}`
      )
      .subscribe((isTrue: boolean) => {
        if (isTrue) {
          this.sub$.sink = this.purchaseOrderPaymentService
            .deletePurchaseOrderPayment(payment.id ?? '')
            .subscribe(() => {
              this.isChanged = true;
              this.toastrService.success(this.translationService.getValue('PAYMENT_IS_DELETED'));
              this.getAllPurchaseOrderPaymentById();
            });
        }
      });
  }

  getDataIndex(row: PurchaseOrderPayment): number {
    return this.dataSource.indexOf(row);
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }
}
