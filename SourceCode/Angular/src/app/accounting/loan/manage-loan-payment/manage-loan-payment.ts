import { Component, Inject, inject, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { BaseComponent } from '../../../base.component';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { LoanService } from '../loan.service';
import { ToastrService } from '@core/services/toastr.service';
import { Loan } from '../model/loan';

@Component({
  selector: 'app-manage-loan-payment',
  imports: [
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    TranslateModule,
    ReactiveFormsModule,
    PageHelpTextComponent,
    MatDialogModule,
    MatDatepickerModule
  ],
  templateUrl: './manage-loan-payment.html',
  styleUrl: './manage-loan-payment.scss'
})
export class ManageLoanPayment extends BaseComponent implements OnInit {
  loanPaymentForm!: FormGroup;
  fb = inject(FormBuilder);
  errorMessage = false;
  maxDate = new Date();

  loanService = inject(LoanService);
  toastrService = inject(ToastrService);

  constructor(
    public dialogRef: MatDialogRef<ManageLoanPayment>,
    @Inject(MAT_DIALOG_DATA) public data = {} as Loan
  ) {
    super();
  }

  ngOnInit(): void {
    this.createLoanPaymentForm();
    if (this.data && this.data.id) {
      this.loanPaymentForm.patchValue({
        loanDetailId: this.data.id,
        loanDetailName: this.data.accountName
      });
    }
  }

  createLoanPaymentForm() {
    this.loanPaymentForm = this.fb.group({
      loanDetailId: [''],
      loanDetailName: [''],
      principalAmount: [null, [this.PrincipalAmountValidator(this.data?.totalPaidPricipalAmount ?? 0, this.data?.loanAmount ?? 0)]],
      interestAmount: [null],
      paymentDate: [new Date(), Validators.required],
      notes: ['']
    }, { validators: [this.pricipalAndInterestAmountValidator] });
  }

  PrincipalAmountValidator(totalPaidPrincipal: number, loanAmount: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value ?? 0;
      const totalPrincipalAmount = (totalPaidPrincipal ?? 0) + value;

      return loanAmount < totalPrincipalAmount
        ? { exceedLoanAmount: true }
        : null;
    };
  }

  pricipalAndInterestAmountValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
    const principalAmount = group.get('principalAmount')?.value;
    const interestAmount = group.get('interestAmount')?.value;

    if (!principalAmount && !interestAmount) {
      return { bothRequired: true }; // group-level error
    }

    return null;
  };

  onCancel() {
    this.dialogRef.close();
  }

  onSubmit() {
    if (!this.loanPaymentForm.valid) {
      this.loanPaymentForm.markAllAsTouched();
      return;
    }

    const loanPaymentData = this.loanPaymentForm.getRawValue();
    loanPaymentData.principalAmount ??= 0;
    loanPaymentData.interestAmount ??= 0;

    this.sub$.sink = this.loanService.addLoanPayment(loanPaymentData).subscribe({
      next: (res) => {
        this.toastrService.success(this.translationService.getValue('LOAN_PAYMENT_ADDED_SUCCESSFULLY'));
        this.dialogRef.close(res);
      },
    });
  }
}
