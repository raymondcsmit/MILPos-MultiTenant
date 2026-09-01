import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CurrencyPipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { LedgerAccountListComponent } from './ledger-account-list.component';
import { LedgerAccountService } from '../ledger-account.service';
import { CommonService } from '@core/services/common.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { AccountGroup, AccountType } from '../../account-enum';
import { LedgerAccount, LedgerAccountsWithAssetType } from '../ledger-account';

describe('LedgerAccountListComponent', () => {
  let component: LedgerAccountListComponent;
  let fixture: ComponentFixture<LedgerAccountListComponent>;
  let ledgerAccountService: jasmine.SpyObj<LedgerAccountService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  const accounts: LedgerAccount[] = [
    { id: 'la1', accountCode: '1001', accountName: 'Cash', accountType: AccountType.Asset, accountGroup: AccountGroup.CurrentAsset, openingBalance: 100, isActive: true, isSystem: true },
    { id: 'la2', accountCode: '4001', accountName: 'Sales', accountType: AccountType.Income, accountGroup: AccountGroup.Revenue, openingBalance: 0, isActive: true, isSystem: true },
  ];

  const grouped: LedgerAccountsWithAssetType[] = [
    { accountType: AccountType.Asset, items: [accounts[0]] },
    { accountType: AccountType.Income, items: [accounts[1]] },
  ];

  beforeEach(() => {
    ledgerAccountService = jasmine.createSpyObj<LedgerAccountService>('LedgerAccountService', ['getAllLedgerAccountGroupBy', 'addLedgerAccount', 'updateLedgerAccount']);
    ledgerAccountService.getAllLedgerAccountGroupBy.and.returnValue(of(grouped));
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getLocationsForCurrentUser', 'getPageHelperText']);
    commonService.getLocationsForCurrentUser.and.returnValue(of({ locations: [{ id: 'loc1', name: 'Main' }], selectedLocation: 'loc1' } as any));
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);

    TestBed.configureTestingModule({
      imports: [LedgerAccountListComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        { provide: CommonService, useValue: commonService },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: LedgerAccountService, useValue: ledgerAccountService },
        { provide: TranslationService, useValue: (() => {
          const spy = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
          (spy as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
          return spy;
        })() },
        { provide: MatDialog, useValue: dialog },
        CurrencyPipe,
      ],
    });
  });

  function load(): void {
    fixture = TestBed.createComponent(LedgerAccountListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create, load locations and grouped accounts for the selected location', () => {
    load();
    expect(component).toBeTruthy();
    expect(component.locations.length).toBe(1);
    expect(component.selectedLocation).toBe('loc1');
    expect(ledgerAccountService.getAllLedgerAccountGroupBy).toHaveBeenCalledWith('loc1');
    expect(component.dataSource.data.length).toBe(2);
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Cash');
    expect(text).toContain('Sales');
  });

  it('changing business location refetches accounts for that location', () => {
    load();
    ledgerAccountService.getAllLedgerAccountGroupBy.and.returnValue(of([]));
    component.onChangeBusinssLocation('loc2');
    expect(ledgerAccountService.getAllLedgerAccountGroupBy).toHaveBeenCalledWith('loc2');
    expect(component.dataSource.data.length).toBe(0);
  });

  it('ledger account dialog result is appended to the grouped data', () => {
    load();
    const created = { id: 'la9', accountCode: '1002', accountName: 'Bank' } as LedgerAccount;
    dialog.open.and.returnValue({ afterClosed: () => of(created) } as any);
    component.openLedgerAccountDialog();
    expect(dialog.open).toHaveBeenCalled();
    expect(component.dataSource.data.length).toBe(3);
    expect(component.dataSource.data[2]).toBe(created as unknown as LedgerAccountsWithAssetType);
  });

  it('dialog closed without result leaves data unchanged', () => {
    load();
    dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as any);
    component.openLedgerAccountDialog();
    expect(component.dataSource.data.length).toBe(2);
  });

  it('opening balance dialog reloads accounts after it closes', () => {
    load();
    (dialog as any).afterAllClosed = of(undefined);
    const before = ledgerAccountService.getAllLedgerAccountGroupBy.calls.count();
    component.openOpeningBalanceDialog();
    expect(dialog.open).toHaveBeenCalled();
    expect(ledgerAccountService.getAllLedgerAccountGroupBy.calls.count()).toBe(before + 1);
  });

  it('filter setters feed the debounced filter pipeline', fakeAsync(() => {
    load();
    component.AccountCodeFilter = '1001';
    component.AccountNameFilter = 'Cash';
    tick(400);
    expect(component.AccountCodeFilter).toBe('1001');
    expect(component.AccountNameFilter).toBe('Cash');
  }));
});
