import { AfterViewInit, ChangeDetectorRef, Component, inject, ViewChild } from '@angular/core';
import { debounceTime, distinctUntilChanged, Observable, Subject } from 'rxjs';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { CommonService } from '@core/services/common.service';
import { AccountGroup, AccountType } from '../../account-enum';
import { TranslateModule } from '@ngx-translate/core';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { AccountTypePipe } from '../account-type.pipe';
import { AccountGroupPipe } from '../account-group.pipe';
import { BaseComponent } from '../../../base.component';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { OpeningBalance } from '../../opening-balance/opening-balance';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { NgClass } from '@angular/common';
import { ManageLedgerAccount } from '../manage-ledger-account/manage-ledger-account';
import { LedgerAccount, LedgerAccountsWithAssetType } from '../ledger-account';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { LedgerAccountService } from '../ledger-account.service';

@Component({
  selector: 'app-ledger-account-list',
  imports: [
    MatTableModule,
    MatSelectModule,
    MatSortModule,
    MatPaginatorModule,
    FormsModule,
    MatIconModule,
    AccountTypePipe,
    AccountGroupPipe,
    PageHelpTextComponent,
    MatButtonModule,
    TranslateModule,
    MatCardModule,
    HasClaimDirective,
    NgClass,
    CustomCurrencyPipe
  ],
  templateUrl: './ledger-account-list.component.html',
  styleUrl: './ledger-account-list.component.scss',
})
export class LedgerAccountListComponent extends BaseComponent implements AfterViewInit {
  displayedColumns: string[] = [
    'actions',
    'accountCode',
    'accountName',
    'accountType',
    'accountGroup',
    'openingBalance'
  ];
  filterColumns: string[] = [
    'actions-search',
    'accountCode-search',
    'accountName-search',
    'accountType-search',
    'accountGroup-search',
    'openingBalance-search'
  ];
  footerToDisplayed: string[] = ['footer'];
  ledgerAccountService = inject(LedgerAccountService);
  loading$!: Observable<boolean>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  public filterObservable$: Subject<string> = new Subject<string>();
  _accountCodeFilter: string = '';
  _accountNameFilter: string = '';
  AccountType = AccountType;
  AccountGroup = AccountGroup;
  private dialog = inject(MatDialog);
  selectedLocation: string = '';
  locations: BusinessLocation[] = [];
  dataSource = new MatTableDataSource<LedgerAccountsWithAssetType>();

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

  public get AccountCodeFilter(): string {
    return this._accountCodeFilter;
  }

  public set AccountCodeFilter(v: string) {
    if (this._accountCodeFilter !== v) {
      this._accountCodeFilter = v;
      const accountCodeFilter = `accountCode#${v}`;
      this.filterObservable$.next(accountCodeFilter);
    }
  }

  public get AccountNameFilter(): string {
    return this._accountNameFilter;
  }

  public set AccountNameFilter(v: string) {
    if (this._accountNameFilter !== v) {
      this._accountNameFilter = v;
      const accountNameFilter = `accountName#${v}`;
      this.filterObservable$.next(accountNameFilter);
    }
  }

  private _accountTypeFilter!: string;
  public get AccountTypeFilter(): string {
    return this._accountTypeFilter;
  }
  public set AccountTypeFilter(v: string) {
    if (this._accountTypeFilter !== v) {
      this._accountTypeFilter = v;
      const accountTypeFilter = `accountType#${v}`;
      this.filterObservable$.next(accountTypeFilter);
    }
  }

  private _accountGroupFilter!: string;
  public get AccountGroupFilter(): string {
    return this._accountGroupFilter;
  }
  public set AccountGroupFilter(v: string) {
    if (this._accountGroupFilter !== v) {
      this._accountGroupFilter = v;
      const accountGroupFilter = `accountGroup#${v}`;
      this.filterObservable$.next(accountGroupFilter);
    }
  }

  applyFilter() {
    const filterValue = {
      accountCode: this._accountCodeFilter,
      accountName: this._accountNameFilter,
      accountType: this._accountTypeFilter,
      accountGroup: this._accountGroupFilter
    };

    // this.dataSource.filter = JSON.stringify(filterValue);

    // if (this.dataSource.paginator) {
    //   this.dataSource.paginator.firstPage();
    // }
  }


  constructor(
    private cd: ChangeDetectorRef,
    private commonService: CommonService
  ) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.getBusinessLocations();

    // this.dataSource.filterPredicate = (data: LedgerAccountsWithAssetType, filter: string) => {
    //   const filters = JSON.parse(filter);

    //   const accountCodeMatch = !filters.accountCode ||
    //     data.accountCode?.toLowerCase().includes(filters.accountCode.toLowerCase());

    //   const accountNameMatch = !filters.accountName ||
    //     data.accountName?.toLowerCase().includes(filters.accountName.toLowerCase());

    //   const accountTypeMatch = !filters.accountType ||
    //     data.accountType === Number(filters.accountType);

    //   const accountGroupMatch = !filters.accountGroup ||
    //     data.accountGroup === Number(filters.accountGroup);

    //   return accountCodeMatch && accountNameMatch && accountTypeMatch && accountGroupMatch;
    // };

    this.sub$.sink = this.filterObservable$
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.applyFilter();
      });
  }

  getBusinessLocations() {
    this.commonService.getLocationsForCurrentUser().subscribe((locationResponse) => {
      this.locations = locationResponse.locations;
      this.selectedLocation = locationResponse.selectedLocation;
      this.getAllAccounts(this.selectedLocation);
      this.cd.detectChanges();
    });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.dataSource.data.indexOf(row);
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  onChangeBusinssLocation(event: any) {
    this.getAllAccounts(event);
  }

  openOpeningBalanceDialog() {
    this.dialog.open(OpeningBalance, {
      maxWidth: '40vw',
      width: '100%',
    });

    this.sub$.sink = this.dialog.afterAllClosed.subscribe(() => {
      this.getAllAccounts(this.selectedLocation);
    });
  }

  openLedgerAccountDialog(account?: LedgerAccount) {
    const dialogRef = this.dialog.open(ManageLedgerAccount, {
      maxWidth: '35vw',
      width: '100%',
      maxHeight: '90vh',
      data: account ? account : null
    });

    this.sub$.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.dataSource.data = [...this.dataSource.data, result];
      }
    });
  }

  getAllAccounts(locationId: string) {
    this.sub$.sink = this.ledgerAccountService.getAllLedgerAccountGroupBy(locationId).subscribe((accounts) => {
      this.dataSource.data = accounts;
      this.applyFilter();
    });
  }
}
