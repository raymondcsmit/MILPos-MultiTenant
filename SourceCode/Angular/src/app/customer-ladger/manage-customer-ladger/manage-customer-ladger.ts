import { Component, Inject, inject, OnInit, Optional } from '@angular/core';
import { BaseComponent } from '../../base.component';
import {
  AbstractControl,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { Account } from '../account';
import { RouterModule } from '@angular/router';
import { CustomerLadgerService } from '../customer-ladger.service';
import { CommonService } from '@core/services/common.service';
import { SalesOrderOverdue } from '../sales-overdue';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { CustomerLadgerHistory } from '../customer-ladger-history';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { AccountResourceParameter } from '../account-resource-parameter';
import { CustomerLadgerStore } from '../customer-ladger-list/customer-ladger-store';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-manage-customer-ladger',
  imports: [
    FormsModule,
    TranslateModule,
    CommonModule,
    RouterModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSlideToggleModule,
    MatIconModule,
    PageHelpTextComponent,
    MatDividerModule,
    MatSelectModule,
    MatDialogModule,
    MatCardModule,
  ],
  templateUrl: './manage-customer-ladger.html',
  styleUrl: './manage-customer-ladger.scss',
})
export class ManageCustomerLadger extends BaseComponent implements OnInit {
  customerLadgerForm!: UntypedFormGroup;
  locations: BusinessLocation[] = [];
  customerLadgerResource!: AccountResourceParameter;
  accounts: Account[] = [];
  accountNameControl: FormControl = new FormControl();
  overdue: number = 0.0;
  isCustomer: boolean = false;
  customerLadgerStore = inject(CustomerLadgerStore);
  constructor(
    public dialogRef: MatDialogRef<ManageCustomerLadger>,
    private fb: UntypedFormBuilder,
    private customerLadgerService: CustomerLadgerService,
    private commonService: CommonService,
    @Optional() @Inject(MAT_DIALOG_DATA) public data?: { customerId?: string }
  ) {
    super();
    this.getLangDir();
    this.customerLadgerResource = new AccountResourceParameter();
  }

  ngOnInit(): void {
    this.createCustomerLadgerForm();
    this.getBusinessLocations();
    this.getAccounts();
    this.customerNameChangeValue();
    if (this.data?.customerId) {
      this.customerLadgerForm.patchValue({
        accountId: this.data.customerId,
      });
      this.loadAccountSalesOrderData(this.data.customerId);
    }
    this.customerLadgerForm.get('accountId')!.valueChanges.subscribe((accountId) => {
      if (accountId) {
        this.isCustomer = this.accounts.some(
          (account) => account.id === accountId && account.isCustomer === true
        );
        if (this.isCustomer) {
          this.customerLadgerService
            .getSalesOrderOverdueByAccountId(accountId)
            .subscribe((salesOrderOverdue: SalesOrderOverdue) => {
              this.overdue = salesOrderOverdue.overdue;
            });
        }
      }
    });
  }

  createCustomerLadgerForm() {
    var currentDate = this.CurrentDate;
    this.customerLadgerForm = this.fb.group({
      id: [''],
      Date: [currentDate, [Validators.required]],
      accountId: ['', [Validators.required]],
      locationId: ['', [Validators.required]],
      description: [''],
      amount: ['', [Validators.required, Validators.min(0), this.amountValidator.bind(this)]],
      reference: [''],
      overdue: [this.overdue],
      note: [''],
    });
  }

  amountValidator(control: AbstractControl): ValidationErrors | null {
    if (control.value > this.overdue) {
      return { exceedsOverdue: true };
    }
    return null;
  }

  private loadAccountSalesOrderData(accountId: string) {
    this.customerLadgerService
      .getSalesOrderOverdueByAccountId(accountId)
      .subscribe((salesOrderOverdue: SalesOrderOverdue) => {
        this.overdue = salesOrderOverdue.overdue;

        this.customerLadgerForm.patchValue({
          overdue: this.overdue,
        });
      });
  }

  getBusinessLocations() {
    this.commonService.getLocationsForCurrentUser().subscribe((locationResponse) => {
      this.locations = locationResponse.locations;
      if (this.locations?.length > 0) {
        this.customerLadgerForm.patchValue({
          locationId: locationResponse.selectedLocation,
        });
      }
    });
  }

  customerNameChangeValue() {
    this.sub$.sink = this.accountNameControl.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((c) => {
          this.customerLadgerResource.name = c;
          return this.customerLadgerService.getAccountsForDropDown(
            this.customerLadgerResource.name
          );
        })
      )
      .subscribe((resp: Account[]) => {
        this.accounts = resp;
      });
  }

  getAccounts() {
    this.customerLadgerService
      .getAccountsForDropDown(this.customerLadgerResource.name)
      .subscribe((resp) => {
        this.accounts = resp;
      });
  }

  onCustomerLadgerSubmit() {
    if (this.customerLadgerForm.invalid) {
      this.customerLadgerForm.markAllAsTouched();
      return;
    }
    const accountHistory: CustomerLadgerHistory = this.customerLadgerForm.getRawValue();
    accountHistory.customerId = accountHistory.accountId;
    accountHistory.overdue = this.overdue;
    accountHistory.accountName =
      this.accounts.find((a) => a.id === accountHistory.accountId)?.name || '';
    this.customerLadgerStore.addCustomerLadger(accountHistory);
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
