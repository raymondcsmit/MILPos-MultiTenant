import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { OpeningBalanceService } from './opening-balance-service';
import { BaseComponent } from '../../base.component';
import { OpeningBalanceModel } from './model/opening-balance';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { OpeningBalanceType } from './model/opening-balance-type-enum';
import { CommonService } from '@core/services/common.service';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { FinancialYearStore } from '../financial-year/financial-year-store';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { ToastrService } from '@core/services/toastr.service';
import { LedgerAccount } from '../ledger-account/ledger-account';
import { LedgerAccountService } from '../ledger-account/ledger-account.service';

@Component({
  selector: 'app-opening-balance',
  imports: [
    MatCardModule,
    MatIconModule,
    TranslateModule,
    ReactiveFormsModule,
    PageHelpTextComponent,
    MatDialogModule,
    MatButtonModule,
    MatSelectModule,
    UTCToLocalTime
  ],
  templateUrl: './opening-balance.html',
  styleUrl: './opening-balance.scss'
})
export class OpeningBalance extends BaseComponent implements OnInit {
  openingBalanceForm!: FormGroup;
  fb = inject(FormBuilder);
  openingBalanceService = inject(OpeningBalanceService);
  commonService = inject(CommonService);
  financialYearStore = inject(FinancialYearStore);
  toasterService = inject(ToastrService);
  ledgerAccountService = inject(LedgerAccountService);
  locationOptions: BusinessLocation[] = []
  ledgerAccounts: LedgerAccount[] = [];
  filteredLedgerAccounts: LedgerAccount[] = [];

  typeOptions = Object.keys(OpeningBalanceType)
    .filter(key => !isNaN(Number(OpeningBalanceType[key as any])))
    .map(key => ({
      name: key,
      id: OpeningBalanceType[key as keyof typeof OpeningBalanceType]
    }));

  constructor(
    public dialogRef: MatDialogRef<OpeningBalanceModel>
  ) {
    super();
  }

  ngOnInit(): void {
    this.createOpeningBalanceForm();
    this.getBusinessLocations();
    this.getLedgerAccounts();
  }

  onAccountSearch(searchText: string): void {
    if (!searchText) {
      this.filteredLedgerAccounts = [...this.ledgerAccounts];
      return;
    }
    this.filteredLedgerAccounts = this.ledgerAccounts.filter(account =>
      account.accountName.toLowerCase().includes(searchText.toLowerCase()) ||
      account.accountCode.toLowerCase().includes(searchText.toLowerCase()));
  }


  createOpeningBalanceForm(): void {
    this.openingBalanceForm = this.fb.group({
      financialYearId: [''],
      locationId: ['', [Validators.required]],
      accountId: ['', [Validators.required]],
      openingBalance: ['', [Validators.required]],
      type: ['', [Validators.required]]
    });
  }

  getBusinessLocations() {
    this.commonService.getLocationsForCurrentUser().subscribe((locationResponse) => {
      this.locationOptions = locationResponse.locations;
      if (this.locationOptions?.length > 0 && !this.openingBalanceForm.get('locationId')?.value) {
        this.openingBalanceForm.patchValue({ locationId: locationResponse.selectedLocation });
      }
    });
  }

  getLedgerAccounts() {
    this.ledgerAccountService.getLedgerAccounts().subscribe((response) => {
      const accounts = response as LedgerAccount[];
      if (accounts && accounts.length > 0) {
        this.ledgerAccounts = accounts;
        this.filteredLedgerAccounts = [...this.ledgerAccounts];
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (!this.openingBalanceForm.valid) {
      this.openingBalanceForm.markAllAsTouched();
      return;
    }

    const openingBalance: OpeningBalanceModel = this.openingBalanceForm.getRawValue();
    openingBalance.financialYearId = this.financialYearStore.currentFinancialYear()?.id || '';

    this.sub$.sink = this.openingBalanceService
      .addOpeningBalance(openingBalance)
      .subscribe({
        next: () => {
          this.toasterService.success(this.translationService.getValue('OPENING_BALANCE_ADDED_SUCCESSFULLY'));
          this.dialogRef.close();
        }
      });
  }
}
