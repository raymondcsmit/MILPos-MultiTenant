import { Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { BaseComponent } from '../../../base.component';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { CommonService } from '@core/services/common.service';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { LoanService } from '../loan.service';
import { ToastrService } from '@core/services/toastr.service';

@Component({
  selector: 'app-manage-loan',
  imports: [
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    TranslateModule,
    PageHelpTextComponent,
    ReactiveFormsModule,
    RouterLink,
    MatSelectModule,
    MatDatepickerModule
  ],
  templateUrl: './manage-loan.html',
  styleUrl: './manage-loan.scss'
})
export class ManageLoan extends BaseComponent implements OnInit {
  LoanForm!: FormGroup;
  fb = inject(FormBuilder);
  commonService = inject(CommonService);
  loanService = inject(LoanService);
  router = inject(Router);
  toasterService = inject(ToastrService);
  branches: BusinessLocation[] = [];
  maxDate = new Date();

  ngOnInit(): void {
    this.createLoanForm();
    this.getBusinessLocations();
  }

  createLoanForm() {
    this.LoanForm = this.fb.group({
      loanNumber: ['', [Validators.required]],
      branchId: ['', [Validators.required]],
      loanAmount: [null, [Validators.required, Validators.min(1)]],
      lenderName: ['', [Validators.required]],
      loanDate: [new Date(), [Validators.required]],
      narration: ['']
    });
  }

  getBusinessLocations() {
    this.commonService.getLocationsForCurrentUser().subscribe((locationResponse) => {
      this.branches = locationResponse.locations;
      if (this.branches?.length > 0 && !this.LoanForm.get('branchId')?.value) {
        this.LoanForm.patchValue({ branchId: locationResponse.selectedLocation });
      }
    });
  }


  onSubmit() {
    if (!this.LoanForm.valid) {
      this.LoanForm.markAllAsTouched();
      return;
    }

    const loanData = this.LoanForm.getRawValue();
    loanData.loanAmount ??= 0;

    this.sub$.sink = this.loanService.addLoan(loanData).subscribe({
      next: () => {
        this.toasterService.success(this.translationService.getValue('LOAN_ADDED_SUCCESSFULLY'));
        this.router.navigate(['/accounting/loans']);
      },
    });
  }
}
