import { Component, Inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { PaymentMethod } from '@core/domain-classes/payment-method';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';
import { PurchaseOrderPayment } from '@core/domain-classes/purchase-order-payment';
import { ToastrService } from '@core/services/toastr.service';
import { PurchaseOrderPaymentService } from '../purchase-order-payment.service';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { TranslateModule } from '@ngx-translate/core';
import { MatSelectModule } from '@angular/material/select';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { PaymentMethodPipe } from '@shared/pipes/payment-method.pipe';
import { BaseComponent } from '../../base.component';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-add-purchase-order-payments',
  templateUrl: './add-purchase-order-payments.component.html',
  styleUrls: ['./add-purchase-order-payments.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    MatDialogModule,
    MatIconModule,
    ReactiveFormsModule,
    MatDatepickerModule,
    TranslateModule,
    MatSelectModule,
    HasClaimDirective,
    PaymentMethodPipe,
    MatCardModule,
    MatButtonModule
  ]
})
export class AddPurchaseOrderPaymentsComponent extends BaseComponent implements OnInit {
  paymentMethodslist: PaymentMethod[] = [];
  paymentsForm!: UntypedFormGroup;
  isReceiptDeleted = false;
  constructor(
    public dialogRef: MatDialogRef<AddPurchaseOrderPaymentsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PurchaseOrder,
    private purchaseOrderPaymentService: PurchaseOrderPaymentService,
    private toastrService: ToastrService,
    private fb: UntypedFormBuilder) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.createForm();
    this.paymentMethodsList();
    if (this.data.id) {
      this.paymentsForm.get('amount')?.setValue((this.data.totalAmount - (this.data.totalPaidAmount ?? 0) - (this.data.totalRefundAmount ?? 0)));
      this.paymentsForm.get('purchaseOrderId')?.setValue(this.data.id);
      this.paymentsForm.get('paymentMethod')?.setValue(this.paymentMethodslist[0]?.id);
    }
  }

  createForm() {
    this.paymentsForm = this.fb.group({
      id: [''],
      purchaseOrderId: [''],
      paymentDate: [this.CurrentDate, [Validators.required]],
      referenceNumber: [''],
      amount: ['', [Validators.required, Validators.min(1), Validators.max(this.data.totalAmount - (this.data.totalPaidAmount ?? 0))]],
      note: [''],
      paymentMethod: [null, Validators.required],
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  fileEvent($event: any) {
    this.isReceiptDeleted = true;
    let files: File[] = $event.target.files;
    if (files.length == 0) {
      return;
    }
    const file = files[0];
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (_event) => {
      this.paymentsForm.get('attachmentData')?.setValue(reader.result?.toString());
    }
  }

  paymentMethodsList() {
    this.sub$.sink = this.purchaseOrderPaymentService.getPaymentMethod()
      .subscribe(f => this.paymentMethodslist = [...f]);
  }

  savePurchaseOrderPayment(): void {
    if (!this.paymentsForm.valid) {
      this.paymentsForm.markAllAsTouched();
      return;
    }
    const purchaseOrderpayment: PurchaseOrderPayment = this.paymentsForm.value;
    if (this.data.id) {
      this.purchaseOrderPaymentService.addPurchaseOrderPayments(purchaseOrderpayment).subscribe(() => {
        this.toastrService.success(this.translationService.getValue('PAYMENT_ADD_SUCCESSFULLY'));
        this.dialogRef.close(true);
      });
    }
  }
}
