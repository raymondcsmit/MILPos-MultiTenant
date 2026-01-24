import { Component, Inject, inject, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { BaseComponent } from '../../../base.component';
import { MatSelectModule } from '@angular/material/select';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { AccountGroup, AccountType } from '../../account-enum';
import { AccountGroupPipe } from "../account-group.pipe";
import { LedgerAccount } from '../ledger-account';
import { LedgerAccountService } from '../ledger-account.service';
import { ToastrService } from '@core/services/toastr.service';

@Component({
  selector: 'app-manage-ledger-account',
  imports: [
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    TranslateModule,
    MatSelectModule,
    ReactiveFormsModule,
    PageHelpTextComponent,
    MatDialogModule,
    AccountGroupPipe
  ],
  templateUrl: './manage-ledger-account.html',
  styleUrl: './manage-ledger-account.scss'
})
export class ManageLedgerAccount extends BaseComponent implements OnInit {
  ledgerAccountForm!: FormGroup;
  fb = inject(FormBuilder);
  ledgerAccountService = inject(LedgerAccountService);
  toastrService = inject(ToastrService);

  accountTypeGroupMapping: { [key in AccountType]: AccountGroup[] } = {
    [AccountType.Asset]: [AccountGroup.CurrentAsset, AccountGroup.FixedAsset],
    [AccountType.Liability]: [AccountGroup.CurrentLiability, AccountGroup.LongTermLiability],
    [AccountType.Equity]: [AccountGroup.Capital],
    [AccountType.Income]: [AccountGroup.Revenue],
    [AccountType.Expense]: [AccountGroup.DirectExpense, AccountGroup.IndirectExpense]
  };

  accountType = Object.keys(AccountType)
    .filter((key) => !isNaN(Number(AccountType[key as any])))
    .map((key) => ({
      label: key,
      value: AccountType[key as keyof typeof AccountType],
    }));

  accountGroup = Object.keys(AccountGroup)
    .filter((key) => !isNaN(Number(AccountGroup[key as any])))
    .map((key) => ({
      label: key,
      value: AccountGroup[key as keyof typeof AccountGroup],
    }));

  filteredAccountGroups = [...this.accountGroup];

  constructor(
    public dialogRef: MatDialogRef<ManageLedgerAccount>,
    @Inject(MAT_DIALOG_DATA) public data: LedgerAccount | null,
  ) {
    super();
  }

  ngOnInit(): void {
    this.initializeForm();

    if (this.data !== null) {
      this.ledgerAccountForm.patchValue(this.data);
      this.ledgerAccountForm.get('accountType')?.disable();
      this.ledgerAccountForm.get('accountGroup')?.disable();
    } else {
      this.setupAccountTypeListener();
    }
  }

  initializeForm() {
    this.ledgerAccountForm = this.fb.group({
      id: [''],
      accountCode: ['', [Validators.required]],
      accountName: ['', [Validators.required]],
      accountType: [null, [Validators.required]],
      accountGroup: [null, [Validators.required]],
    });
  }

  setupAccountTypeListener() {
    this.ledgerAccountForm.get('accountType')?.valueChanges.subscribe((selectedAccountType) => {
      this.ledgerAccountForm.get('accountGroup')?.setValue('');
      this.filterAccountGroups(selectedAccountType);
    });
  }

  filterAccountGroups(selectedAccountType: AccountType) {
    if (selectedAccountType && this.accountTypeGroupMapping[selectedAccountType]) {
      const allowedGroups = this.accountTypeGroupMapping[selectedAccountType];
      this.filteredAccountGroups = this.accountGroup.filter(group =>
        allowedGroups.includes(group.value)
      );
    } else {
      this.filteredAccountGroups = [...this.accountGroup];
    }
  }

  onCancel() {
    this.dialogRef.close();
  }

  onSubmit() {
    if (!this.ledgerAccountForm.valid) {
      this.ledgerAccountForm.markAllAsTouched();
      return;
    }

    const ledgerAccountData = this.ledgerAccountForm.getRawValue();

    if (this.data && this.data?.id) {
      this.ledgerAccountService.updateLedgerAccount(ledgerAccountData).subscribe((res) => {
        this.dialogRef.close(res);
      });
    } else {
      this.ledgerAccountService.addLedgerAccount(ledgerAccountData).subscribe((res) => {
        this.dialogRef.close(res);
      });
    }
  }
}


