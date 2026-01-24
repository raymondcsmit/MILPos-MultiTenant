import { ChangeDetectorRef, Component, inject, OnInit, ViewChild } from '@angular/core';
import { BaseComponent } from '../../base.component';
import { CustomerLadgerStore } from './customer-ladger-store';
import { CustomerLadgerResourceParameter } from './customer-ladger-resource-parameter';
import {
  debounceTime,
  distinctUntilChanged,
  merge,
  Observable,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Account } from '../account';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule, SortDirection } from '@angular/material/sort';
import { Router, RouterModule } from '@angular/router';
import { CommonService } from '@core/services/common.service';
import { CustomerLadgerService } from '../customer-ladger.service';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { UTCToLocalTime } from '../../shared/pipes/utc-to-local-time.pipe';
import { MatDividerModule } from '@angular/material/divider';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { ManageCustomerLadger } from '../manage-customer-ladger/manage-customer-ladger';
import { MatDialog } from '@angular/material/dialog';
import { MatCardModule } from "@angular/material/card";

@Component({
  selector: 'app-customer-ladger-list',
  imports: [
    MatButtonModule,
    MatTableModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatSortModule,
    MatPaginatorModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    MatIconModule,
    TranslateModule,
    CustomCurrencyPipe,
    RouterModule,
    PageHelpTextComponent,
    UTCToLocalTime,
    MatDividerModule,
    MatDatepickerModule,
    MatCardModule
],
  templateUrl: './customer-ladger-list.html',
  styleUrl: './customer-ladger-list.scss',
})
export class CustomerLadgerList extends BaseComponent implements OnInit {
  displayedColumns: string[] = [
    'date',
    'amount',
    'balance',
    'overdue',
    'reference',
    'accountId',
    'location',
    'description',
    'note',
  ];
  filteredColoumns: string[] = [
    'date-search',
    'amount-search',
    'balance-search',
    'overdue-search',
    'reference-search',
    'accountId-search',
    'location-search',
    'description-search',
    'note-search',
  ];
  footerToDisplayed = ['footer'];
  customerLadgerStore = inject(CustomerLadgerStore);
  customerLadgerResource: CustomerLadgerResourceParameter = {
    ...this.customerLadgerStore.customerLadgerResourceParameter(),
  };
  loading$!: Observable<boolean>;
  loading = this.customerLadgerStore.isLoading();
  locations: BusinessLocation[] = [];
  accounts: Account[] = [];
  accountNameControl: FormControl = new FormControl();
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  _referenceFilter: string = this.customerLadgerResource.reference;
  _accountFilter: string = this.customerLadgerResource.accountId;
  _locationFilter: string = this.customerLadgerResource.locationId;
  _customerFilter: string = this.customerLadgerResource.customerId;
  _accountDateFilter: Date | null = this.customerLadgerResource.accountDate ?? null;

  public filterObservable$: Subject<string> = new Subject<string>();

  public get AccountDateFilter(): Date | null {
    return this._accountDateFilter;
  }

  public set AccountDateFilter(v: Date | null) {
    if (this._accountDateFilter !== v) {
      this._accountDateFilter = v;
      const accountDateFilter = `accountDate#${v}`;
      this.filterObservable$.next(accountDateFilter);
    }
  }

  public get CustomerFilter(): string {
    return this._customerFilter;
  }

  public set CustomerFilter(v: string) {
    if (this._customerFilter !== v) {
      this._customerFilter = v;
      const customerFilter = `customerName:${v}`;
      this.filterObservable$.next(customerFilter);
    }
  }

  public get LocationFilter(): string {
    return this._locationFilter;
  }

  public set LocationFilter(v: string) {
    this._locationFilter = v ? v : '';
    const locationFilter = `locationId:${this._locationFilter}`;
    this.filterObservable$.next(locationFilter);
  }

  public get ReferenceFilter(): string {
    return this._referenceFilter;
  }

  public set ReferenceFilter(v: string) {
    this._referenceFilter = v ? v : '';
    const referenceFilter = `reference:${this._referenceFilter}`;
    this.filterObservable$.next(referenceFilter);
  }

  public get AccountFilter(): string {
    return this._accountFilter;
  }

  public set AccountFilter(v: string) {
    this._accountFilter = v;
    const accountFilter = `accountId:${v}`;
    this.filterObservable$.next(accountFilter);
  }

  orderByColumn: string = '';
  orderByDirection: SortDirection = 'asc';

  constructor(
    private cd: ChangeDetectorRef,
    private dialog: MatDialog,
    private router: Router,
    private customerLadgerService: CustomerLadgerService,
    private commonService: CommonService
  ) {
    super();
    this.getLangDir();
    this.getBusinessLocations();
    this.getAccounts();
    this.customerNameChangeValue();
  }

  ngOnInit(): void {
    const orderBy = this.customerLadgerStore.customerLadgerResourceParameter()?.orderBy?.split(' ');
    if (orderBy?.length) {
      this.orderByColumn = orderBy[0];
      this.orderByDirection = orderBy[1]?.toLowerCase() === 'desc' ? 'desc' : 'asc';
    }
    this._referenceFilter = this.customerLadgerResource.reference;
    this._accountFilter = this.customerLadgerResource.accountId;
    this._locationFilter = this.customerLadgerResource.locationId;
    this._accountDateFilter = this.customerLadgerResource.accountDate ?? null;
    this._customerFilter = this.customerLadgerResource.customerId;
    this.sub$.sink = this.filterObservable$
      .pipe(debounceTime(1000), distinctUntilChanged())
      .subscribe((c) => {
        this.customerLadgerResource.skip = 0;
        this.paginator.pageIndex = 0;
        const strArray: Array<string> = c.split('#');
        if (strArray[0] === 'location') {
          this.customerLadgerResource.locationId = strArray[1];
        } else if (strArray[0] === 'accountDate') {
          if (strArray[1] != 'null') {
            this.customerLadgerResource.accountDate = new Date(strArray[1]);
          } else {
            this.customerLadgerResource.accountDate = null;
          }
        } else if (strArray[0] === 'reference') {
          this.customerLadgerResource.reference = strArray[1];
        } else if (strArray[0] === 'customerName') {
          this.customerLadgerResource.customerId = strArray[1];
        }
        this.customerLadgerStore.loadByQuery(this.customerLadgerResource);
      });
  }

  refresh() {
    this.customerLadgerStore.loadByQuery(this.customerLadgerResource);
  }

  ngAfterViewInit() {
    this.sort.sortChange.subscribe(() => (this.paginator.pageIndex = 0));

    this.sub$.sink = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        tap(() => {
          this.customerLadgerResource.skip = this.paginator.pageIndex * this.paginator.pageSize;
          this.customerLadgerResource.pageSize = this.paginator.pageSize;
          this.customerLadgerResource.orderBy = this.sort.active + ' ' + this.sort.direction;
          this.customerLadgerStore.loadByQuery(this.customerLadgerResource);
        })
      )
      .subscribe();
  }

  clearDate() {
    this.AccountDateFilter = null;
  }

  addPendingPayment() {
    const dialogRef = this.dialog.open(ManageCustomerLadger, {
      minWidth: '50vw',
      direction: this.langDir,
    });
    dialogRef.afterClosed().subscribe((data: boolean) => {
      if (data) {
         this.customerLadgerStore.loadByQuery(this.customerLadgerResource);
      }
    });
  }

  getBusinessLocations() {
    this.commonService.getLocationsForCurrentUser().subscribe((locationResponse) => {
      this.locations = locationResponse.locations;
    });
  }

  customerNameChangeValue() {
    this.sub$.sink = this.accountNameControl.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((c) => {
          this.customerLadgerResource.name = c;
          //this.customerLadgerResource.id = null;
          return this.customerLadgerService.getAccountsForDropDown(
            this.customerLadgerResource.name
            //this.customerLadgerResource.id
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
}
