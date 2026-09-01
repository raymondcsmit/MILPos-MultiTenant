import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { ManageLedgerAccount } from './manage-ledger-account';
import { LedgerAccountService } from '../ledger-account.service';
import { TranslationService } from '@core/services/translation.service';
import { ToastrService } from '@core/services/toastr.service';
import { CommonService } from '@core/services/common.service';
import { AccountGroup, AccountType } from '../../account-enum';
import { LedgerAccount } from '../ledger-account';

describe('ManageLedgerAccount', () => {
  let component: ManageLedgerAccount;
  let fixture: ComponentFixture<ManageLedgerAccount>;
  let ledgerAccountService: jasmine.SpyObj<LedgerAccountService>;
  let dialogRef: { close: jasmine.Spy };

  const existing: LedgerAccount = {
    id: 'la1', accountCode: '1001', accountName: 'Cash',
    accountType: AccountType.Asset, accountGroup: AccountGroup.CurrentAsset, isSystem: false,
  };

  function create(data: LedgerAccount | null): void {
    dialogRef = { close: jasmine.createSpy('close') };
    TestBed.overrideProvider(MatDialogRef, { useValue: dialogRef });
    TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: data });
    fixture = TestBed.createComponent(ManageLedgerAccount);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    ledgerAccountService = jasmine.createSpyObj<LedgerAccountService>('LedgerAccountService', ['addLedgerAccount', 'updateLedgerAccount']);
    ledgerAccountService.addLedgerAccount.and.returnValue(of({ id: 'la9' } as LedgerAccount));
    ledgerAccountService.updateLedgerAccount.and.returnValue(of({ id: 'la1' } as LedgerAccount));

    TestBed.configureTestingModule({
      imports: [ManageLedgerAccount, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: LedgerAccountService, useValue: ledgerAccountService },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'error']) },
        { provide: TranslationService, useValue: (() => {
          const spy = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
          (spy as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
          return spy;
        })() },
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: null },
      ],
    });
  });

  it('should create in add mode with all fields required and full group list', () => {
    create(null);
    expect(component).toBeTruthy();
    expect(component.ledgerAccountForm.invalid).toBeTrue();
    ['accountCode', 'accountName', 'accountType', 'accountGroup'].forEach(f => {
      expect(component.ledgerAccountForm.get(f)?.hasError('required')).toBeTrue();
    });
    expect(component.filteredAccountGroups.length).toBe(component.accountGroup.length);
  });

  it('selecting an account type resets group and filters the group options', () => {
    create(null);
    component.ledgerAccountForm.get('accountType')?.setValue(AccountType.Asset);
    expect(component.ledgerAccountForm.get('accountGroup')?.value).toBe('');
    expect(component.filteredAccountGroups.map(g => g.value)).toEqual([AccountGroup.CurrentAsset, AccountGroup.FixedAsset]);
    component.ledgerAccountForm.get('accountType')?.setValue(AccountType.Expense);
    expect(component.filteredAccountGroups.map(g => g.value)).toEqual([AccountGroup.DirectExpense, AccountGroup.IndirectExpense]);
  });

  it('edit mode prefills, disables type and group, and is valid', () => {
    create(existing);
    expect(component.ledgerAccountForm.get('accountCode')?.value).toBe('1001');
    expect(component.ledgerAccountForm.get('accountType')?.disabled).toBeTrue();
    expect(component.ledgerAccountForm.get('accountGroup')?.disabled).toBeTrue();
    expect(component.ledgerAccountForm.valid).toBeTrue();
    expect(component.filteredAccountGroups.length).toBe(component.accountGroup.length);
  });

  it('invalid submit does not call the service and marks touched', () => {
    create(null);
    component.onSubmit();
    expect(ledgerAccountService.addLedgerAccount).not.toHaveBeenCalled();
    expect(ledgerAccountService.updateLedgerAccount).not.toHaveBeenCalled();
    expect(component.ledgerAccountForm.get('accountCode')?.touched).toBeTrue();
  });

  it('valid add submits raw values and closes with the response', () => {
    create(null);
    component.ledgerAccountForm.get('accountCode')?.setValue('1002');
    component.ledgerAccountForm.get('accountName')?.setValue('Bank');
    component.ledgerAccountForm.get('accountType')?.setValue(AccountType.Asset);
    component.ledgerAccountForm.get('accountGroup')?.setValue(AccountGroup.CurrentAsset);
    component.onSubmit();
    expect(ledgerAccountService.addLedgerAccount).toHaveBeenCalledWith(jasmine.objectContaining({
      accountCode: '1002', accountName: 'Bank',
      accountType: AccountType.Asset, accountGroup: AccountGroup.CurrentAsset,
    }));
    expect(dialogRef.close).toHaveBeenCalledWith({ id: 'la9' });
  });

  it('valid edit updates by id and closes with the response', () => {
    create(existing);
    component.ledgerAccountForm.get('accountName')?.setValue('Cash on hand');
    component.onSubmit();
    expect(ledgerAccountService.updateLedgerAccount).toHaveBeenCalledWith(jasmine.objectContaining({
      id: 'la1', accountName: 'Cash on hand',
      accountType: AccountType.Asset, accountGroup: AccountGroup.CurrentAsset,
    }));
    expect(ledgerAccountService.addLedgerAccount).not.toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledWith({ id: 'la1' });
  });

  it('cancel closes without saving', () => {
    create(null);
    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalled();
    expect(ledgerAccountService.addLedgerAccount).not.toHaveBeenCalled();
  });
});
