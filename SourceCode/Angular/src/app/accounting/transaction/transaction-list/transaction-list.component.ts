import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, inject, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule, SortDirection } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterModule } from '@angular/router';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { CommonService } from '@core/services/common.service';

import { debounceTime, distinctUntilChanged, merge, Observable, Subject, tap } from 'rxjs';
import { TransactionStore } from '../transaction-store';
import { TransactionResourceParameter } from './transaction-resource-parameter';
import { ACCPaymentStatus, TransactionStatus, TransactionType } from '../../account-enum';
import { TransactionStatusPipe } from '../transaction-status.pipe';
import { StatusBadgePipe } from '../status-badge.pipe';
import { PaymentStatusPipe } from '../payment-status.pipe';
import { TransactionTypePipe } from '../transaction-type.pipe';
import { TransactionItemListComponent } from '../transaction-item-list/transaction-item-list.component';
import { Transaction } from '../transaction';
import { TranslateModule } from '@ngx-translate/core';
import { BaseComponent } from '../../../base.component';
import { TableSettingsStore } from '../../../table-setting/table-setting-store';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-transaction-list',
  imports: [
    TranslateModule,
    MatButtonModule,
    MatTableModule,
    MatSelectModule,
    MatSortModule,
    MatPaginatorModule,
    FormsModule,
    CommonModule,
    MatIconModule,
    MatNativeDateModule,
    MatDatepickerModule,
    RouterModule,
    MatSortModule,
    PaymentStatusPipe,
    TransactionTypePipe,
    TransactionItemListComponent,
    PageHelpTextComponent,
    CustomCurrencyPipe,
    UTCToLocalTime,
    MatCardModule
  ],
  templateUrl: './transaction-list.component.html',
  styleUrl: './transaction-list.component.scss',
})
export class TransactionListComponent extends BaseComponent implements AfterViewInit {
  displayedColumns: string[] = [
    'action',
    'transactionDate',
    'transactionNumber',
    'referenceNumber',
    'transactionType',
    'balanceAmount',
    'discountAmount',
    'narration',
    'paidAmount',
    'paymentStatus',
    'subTotal',
    'taxAmount',
    'totalAmount',
    'branchName',
  ];
  filterColumns: string[] = [
    'transactionDate-search',
    'transactionNumber-search',
    'referenceNumber-search',
    'transactionType-search',
    'balanceAmount-search',
    'discountAmount-search',
    'narration-search',
    'paidAmount-search',
    'paymentStatus-search',
    'subTotal-search',
    'taxAmount-search',
    'totalAmount-search',
    'branchName-search',
  ];
  footerToDisplayed: string[] = ['footer'];
  transactionStore = inject(TransactionStore);
  tableSettingsStore = inject(TableSettingsStore);
  transactionResource: TransactionResourceParameter = {
    ...this.transactionStore.transactionResourceParameter(),
  };
  loading$!: Observable<boolean>;
  loading = this.transactionStore.isLoading();
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  expandedElement!: Transaction | null;
  public filterObservable$: Subject<string> = new Subject<string>();
  isSendEmail: boolean = false;
  _fromOrderDateFilter: Date | null = this.transactionResource.fromDate ?? null;
  _toOrderDateFilter: Date | null = this.transactionResource.toDate ?? null;
  _transactionNumberFilter: string = this.transactionResource.transactionNumber ?? '';
  _referenceNumberFilter: string = this.transactionResource.referenceNumber ?? '';
  locations: BusinessLocation[] = [];
  ACCPaymentStatus = ACCPaymentStatus;
  TransactionType = TransactionType;
  get visibleTableKeys(): string[] {
    return this.tableSettingsStore.transactionsTableSettingsVisible().map((c: any) => c.key);
  }

  get visibleTableKeysSearch(): string[] {
    return this.tableSettingsStore
      .transactionsTableSettingsVisible()
      .map((c: any) => c.key + '-search');
  }
  accPaymentStatus = Object.keys(ACCPaymentStatus)
    .filter((key) => !isNaN(Number(ACCPaymentStatus[key as any])))
    .map((key) => ({
      label: key,
      value: ACCPaymentStatus[key as keyof typeof ACCPaymentStatus],
    }));
  transactionStatus = Object.keys(TransactionStatus)
    .filter((key) => !isNaN(Number(TransactionStatus[key as any])))
    .map((key) => ({
      label: key,
      value: TransactionStatus[key as keyof typeof TransactionStatus],
    }));
  transactionType = Object.keys(TransactionType)
    .filter((key) => !isNaN(Number(TransactionType[key as any])))
    .map((key) => ({
      label: key,
      value: TransactionType[key as keyof typeof TransactionType],
    }));

  public get TransactionNumberFilter(): string {
    return this._transactionNumberFilter;
  }

  public set TransactionNumberFilter(v: string) {
    if (this._transactionNumberFilter !== v) {
      this._transactionNumberFilter = v;
      const transactionNumberFilter = `transactionNumber#${v}`;
      this.filterObservable$.next(transactionNumberFilter);
    }
  }

  public get ReferenceNumberFilter(): string {
    return this._referenceNumberFilter;
  }

  public set ReferenceNumberFilter(v: string) {
    if (this._referenceNumberFilter !== v) {
      this._referenceNumberFilter = v;
      const referenceNumberFilter = `referenceNumber#${v}`;
      this.filterObservable$.next(referenceNumberFilter);
    }
  }

  private _transactionTypeFilter!: string;
  public get TransactionTypeFilter(): string {
    return this._transactionTypeFilter;
  }
  public set TransactionTypeFilter(v: string) {
    if (this._transactionTypeFilter !== v) {
      this._transactionTypeFilter = v;
      const transactionTypeFilterValue = `transactionType#${v}`;
      this.filterObservable$.next(transactionTypeFilterValue);
    }
  }

  private _paymentStatusFilter!: string;
  public get PaymentStatusFilter(): string {
    return this._paymentStatusFilter;
  }
  public set PaymentStatusFilter(v: string) {
    if (this._paymentStatusFilter !== v) {
      this._paymentStatusFilter = v;
      const paymentStatusFilerValue = `paymentStatus#${v}`;
      this.filterObservable$.next(paymentStatusFilerValue);
    }
  }

  public get TransactionFromDateFilter(): Date | null {
    return this._fromOrderDateFilter;
  }

  public set TransactionFromDateFilter(v: Date | null) {
    if (this._fromOrderDateFilter !== v) {
      this._fromOrderDateFilter = v;
      const fromDateFilter = `fromDate#${v}`;
      this.filterObservable$.next(fromDateFilter);
    }
  }

  public get TransactionToDateFilter(): Date | null {
    return this._toOrderDateFilter;
  }

  public set TransactionToDateFilter(v: Date | null) {
    if (this._toOrderDateFilter !== v) {
      this._toOrderDateFilter = v;
      const toDateFilter = `toDate#${v}`;
      this.filterObservable$.next(toDateFilter);
    }
  }

  private _locationFilter!: string;
  public get locationFilter(): string {
    return this._locationFilter;
  }
  public set locationFilter(v: string) {
    if (this._locationFilter !== v) {
      this._locationFilter = v;
      const locationFilterValue = `branchId#${v}`;
      this.filterObservable$.next(locationFilterValue);
    }
  }
  orderByColumn: string = '';
  orderByDirection: SortDirection = 'asc';
  constructor(
    private cd: ChangeDetectorRef,
    private router: Router,
    private commonService: CommonService
  ) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    const orderBy = this.transactionStore.transactionResourceParameter()?.orderBy?.split(' ');

    if (orderBy?.length) {
      this.orderByColumn = orderBy[0];
      this.orderByDirection = orderBy[1]?.toLowerCase() === 'desc' ? 'desc' : 'asc';
    }

    this.tableSettingsStore.loadTableSettingByScreenName('Transaction');
    this._fromOrderDateFilter = this.transactionResource.fromDate ?? null;
    this._toOrderDateFilter = this.transactionResource.toDate ?? null;
    this._locationFilter = this.transactionResource.branchId ?? '';
    this._transactionTypeFilter = this.transactionResource.transactionType ?? '';
    this._paymentStatusFilter = this.transactionResource.paymentStatus ?? '';
    this.getBusinessLocations();
    this.sub$.sink = this.filterObservable$
      .pipe(debounceTime(1000), distinctUntilChanged())
      .subscribe((c) => {
        this.transactionResource.skip = 0;
        this.paginator.pageIndex = 0;
        const strArray: Array<string> = c.split('#');
        if (strArray[0] === 'fromDate') {
          if (strArray[1] != 'null') {
            this.transactionResource.fromDate = new Date(strArray[1]);
            this.transactionResource.toDate = this.TransactionToDateFilter;
          } else {
            this.transactionResource.fromDate = null;
            this.transactionResource.toDate = null;
          }
        } else if (strArray[0] === 'toDate') {
          if (strArray[1] != 'null') {
            this.transactionResource.toDate = new Date(strArray[1]);
            this.transactionResource.fromDate = this.TransactionFromDateFilter;
          } else {
            this.transactionResource.fromDate = null;
            this.transactionResource.toDate = null;
          }
        } else if (strArray[0] === 'transactionNumber') {
          this.transactionResource.transactionNumber = strArray[1];
        } else if (strArray[0] === 'referenceNumber') {
          this.transactionResource.referenceNumber = strArray[1];
        } else if (strArray[0] === 'transactionType') {
          this.transactionResource.transactionType = strArray[1];
        } else if (strArray[0] === 'paymentStatus') {
          this.transactionResource.paymentStatus = strArray[1];
        } else if (strArray[0] === 'branchId') {
          this.transactionResource.branchId = strArray[1];
        }
        this.transactionStore.loadByQuery(this.transactionResource);
      });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.transactionStore.transactions().indexOf(row);
  }

  onTableRefresh() {
    this.router.navigate([`/table-settings/Transaction`]);
  }

  refresh() {
    this.transactionStore.loadByQuery(this.transactionResource);
  }

  clearTransactionDates() {
    this.TransactionFromDateFilter = null;
    this.TransactionToDateFilter = null;
  }

  getBusinessLocations() {
    this.commonService.getLocationsForReport().subscribe((locationResposne) => {
      this.locations = locationResposne.locations;
    });
  }

  ngAfterViewInit() {
    this.sort.sortChange.subscribe(() => (this.paginator.pageIndex = 0));

    this.sub$.sink = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        tap(() => {
          this.transactionResource.skip = this.paginator.pageIndex * this.paginator.pageSize;
          this.transactionResource.pageSize = this.paginator.pageSize;
          this.transactionResource.orderBy = this.sort.active + ' ' + this.sort.direction;
          this.transactionStore.loadByQuery(this.transactionResource);
        })
      )
      .subscribe();
  }

  toggleRow(element: Transaction) {
    this.expandedElement = this.expandedElement === element ? null : element;
    this.cd.detectChanges();
  }
}
