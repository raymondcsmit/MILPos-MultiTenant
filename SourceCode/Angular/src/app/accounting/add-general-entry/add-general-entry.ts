import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { CommonService } from '@core/services/common.service';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { LedgerAccount } from '../ledger-account/ledger-account';
import { BaseComponent } from '../../base.component';
import { LedgerAccountService } from '../ledger-account/ledger-account.service';
import { ReportService } from '../reports/report.service';
import { GeneralEntryModel } from '../reports/general-entry-report/general-entry';
import { ToastrService } from "@core/services/toastr.service";

@Component({
  selector: 'app-add-general-entry',
  imports: [
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    TranslateModule,
    MatSelectModule,
    ReactiveFormsModule,
    PageHelpTextComponent,
    MatDialogModule,
    MatDatepickerModule
  ],
  templateUrl: './add-general-entry.html',
  styleUrl: './add-general-entry.scss'
})
export class AddGeneralEntry extends BaseComponent implements OnInit {
  generalEntryForm!: FormGroup;
  fb = inject(FormBuilder);
  locations: BusinessLocation[] = [];
  ledgerAccounts: LedgerAccount[] = [];
  ledgerAccountService = inject(LedgerAccountService);
  reportService = inject(ReportService);
  commonService = inject(CommonService);
  toasterService = inject(ToastrService);

  constructor(
    public dialogRef: MatDialogRef<AddGeneralEntry>
  ) {
    super();
  }

  ngOnInit() {
    this.initForm();
    this.getBusinessLocations();
    this.getAllLedgerAccount();
  }

  initForm() {
    this.generalEntryForm = this.fb.group({
      branchId: ['', [Validators.required]],
      transitionDate: [new Date()],
      narration: ['', [Validators.required]],
      debitLedgerAccountId: ['', [Validators.required]],
      amount: [0, [Validators.required, Validators.min(1)]],
      creditLedgerAccountId: ['', [Validators.required]],
      referenceNumber: ['', [Validators.required]],
    });
  }

  getBusinessLocations() {
    this.commonService.getLocationsForCurrentUser().subscribe((locationResponse) => {
      this.locations = locationResponse.locations;
      if (this.locations?.length > 0) {
        this.generalEntryForm.get('branchId')?.setValue(locationResponse.selectedLocation);
      }
    });
  }

  getAllLedgerAccount() {
    this.sub$.sink = this.ledgerAccountService.getLedgerAccounts().subscribe((accounts) => {
      const ladgerAccounts = accounts as LedgerAccount[];
      if (ladgerAccounts?.length > 0) {
        this.ledgerAccounts = ladgerAccounts;
      }
    });
  }

  saveGeneralEntry() {
    if (!this.generalEntryForm.valid) {
      this.generalEntryForm.markAllAsTouched();
      return;
    }

    const generalEntry: GeneralEntryModel = this.generalEntryForm.getRawValue();
    this.sub$.sink = this.reportService.addGeneralEntry(generalEntry).subscribe((response) => {
      this.dialogRef.close(true);
      this.toasterService.success(this.translationService.getValue('GENERAL_ENTRY_ADD_SUCCESSFULLY'));
    });
  }

  onCancel() {
    this.dialogRef.close();
  }
}
