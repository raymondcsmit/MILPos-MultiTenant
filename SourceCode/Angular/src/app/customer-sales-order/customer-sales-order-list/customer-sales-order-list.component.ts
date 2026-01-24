import { AfterViewInit, ChangeDetectorRef, Component, inject, ViewChild } from '@angular/core';
import { CustomerSalesOrderStore } from '../customer-sales-order-store';
import { CustomerSalesOrderResourceParameter } from './customer-sales-order-resource-parameter';
import {
  debounceTime,
  distinctUntilChanged,
  merge,
  Observable,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule, SortDirection } from '@angular/material/sort';
import { CustomerSalesOrder } from './customer-sales-order';
import { Router } from '@angular/router';
import { CommonService } from '@core/services/common.service';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Customer } from '@core/domain-classes/customer';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule, NgClass } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { PaymentStatus, paymentStatuses } from '@core/domain-classes/paymentaStatus';
import { CustomerSalesOrderPaymentListComponent } from '../customer-sales-order-payment-list/customer-sales-order-payment-list.component';
import { BaseComponent } from '../../base.component';
import { CustomerService } from '../../customer/customer.service';
import { TranslateModule } from '@ngx-translate/core';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { PaymentStatusPipe } from '@shared/pipes/payment-status.pipe';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { MatDialog } from '@angular/material/dialog';
import { ManageCustomerLadger } from '../../customer-ladger/manage-customer-ladger/manage-customer-ladger';
import { MatCardModule } from "@angular/material/card";

@Component({
  selector: 'app-customer-sales-order-list',
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
    CustomerSalesOrderPaymentListComponent,
    TranslateModule,
    CustomCurrencyPipe,
    PaymentStatusPipe,
    PageHelpTextComponent,
    MatCardModule,
    NgClass
  ],
  templateUrl: './customer-sales-order-list.component.html',
  styleUrl: './customer-sales-order-list.component.scss',
})
export class CustomerSalesOrderListComponent extends BaseComponent implements AfterViewInit {
  displayedColumns: string[] = ['action', 'customerName', 'totalPendingAmount', 'paymentStatus'];
  filterColumns: string[] = [
    'action-search',
    'customer-search',
    'totalPendingAmount-search',
    'paymentStatus-search',
  ];
  footerToDisplayed: string[] = ['footer'];
  customerSalesOrderStore = inject(CustomerSalesOrderStore);
  customerSalesOrderResource: CustomerSalesOrderResourceParameter = {
    ...this.customerSalesOrderStore.customerSalesOrderResourceParameter(),
  };
  loading$!: Observable<boolean>;
  loading = this.customerSalesOrderStore.isLoading();
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  expandedElement!: CustomerSalesOrder | null;
  salesPaymentStatuses: PaymentStatus[] = paymentStatuses;
  customerNameControl: FormControl<string | null> = new FormControl<string>({
    value: this.customerSalesOrderResource.customerName ?? '',
    disabled: false,
  });
  customerList$!: Observable<Customer[]>;
  public filterObservable$: Subject<string> = new Subject<string>();
  isSendEmail: boolean = false;
  _fromDateFilter: Date | null = this.customerSalesOrderResource.fromDate ?? null;
  _toDateFilter: Date | null = this.customerSalesOrderResource.toDate ?? null;
  _soCreatedDateFilter: Date | null = this.customerSalesOrderResource.soCreatedDate ?? null;
  _orderNumberFilter: string = this.customerSalesOrderResource.orderNumber;
  _customerFilter: string = this.customerSalesOrderResource.customerName;

  public get OrderNumberFilter(): string {
    return this._orderNumberFilter;
  }

  public set OrderNumberFilter(v: string) {
    if (this._orderNumberFilter !== v) {
      this._orderNumberFilter = v;
      const orderNumberFilter = `orderNumber#${v}`;
      this.filterObservable$.next(orderNumberFilter);
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

  public get SOCreatedDateFilter(): Date | null {
    return this._soCreatedDateFilter;
  }

  public set SOCreatedDateFilter(v: Date | null) {
    if (this._soCreatedDateFilter !== v) {
      this._soCreatedDateFilter = v;
      const sOCreatedDateFilter = `soCreatedDate#${v}`;
      this.filterObservable$.next(sOCreatedDateFilter);
    }
  }

  public get FromDateFilter(): Date | null {
    return this._fromDateFilter;
  }

  public set FromDateFilter(v: Date | null) {
    if (this._fromDateFilter !== v) {
      this._fromDateFilter = v;
      const fromDateFilter = `fromDate#${v}`;
      this.filterObservable$.next(fromDateFilter);
    }
  }

  public get ToDateFilter(): Date | null {
    return this._toDateFilter;
  }

  public set ToDateFilter(v: Date | null) {
    if (this._toDateFilter !== v) {
      this._toDateFilter = v;
      const toDateFilter = `toDate#${v}`;
      this.filterObservable$.next(toDateFilter);
    }
  }

  orderByColumn: string = '';
  orderByDirection: SortDirection = 'asc';

  constructor(
    private cd: ChangeDetectorRef,
    private router: Router,
    private customerService: CustomerService,
    private commonService: CommonService,
    private dialog: MatDialog
  ) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    const orderBy = this.customerSalesOrderStore
      .customerSalesOrderResourceParameter()
      ?.orderBy?.split(' ');
    if (orderBy?.length) {
      this.orderByColumn = orderBy[0];
      this.orderByDirection = orderBy[1]?.toLowerCase() === 'desc' ? 'desc' : 'asc';
    }
    this._fromDateFilter = this.customerSalesOrderResource.fromDate ?? null;
    this._toDateFilter = this.customerSalesOrderResource.toDate ?? null;
    this._soCreatedDateFilter = this.customerSalesOrderResource.soCreatedDate ?? null;
    this._orderNumberFilter = this.customerSalesOrderResource.orderNumber;
    this._customerFilter = this.customerSalesOrderResource.customerName;
    this._paymentStatusFilter = this.customerSalesOrderResource.paymentStatus ?? '';
    this.customerNameControlOnChange();
    this.sub$.sink = this.filterObservable$
      .pipe(debounceTime(1000), distinctUntilChanged())
      .subscribe((c) => {
        this.customerSalesOrderResource.skip = 0;
        this.paginator.pageIndex = 0;
        const strArray: Array<string> = c.split('#');
        if (strArray[0] === 'fromDate') {
          if (strArray[1] != 'null') {
            this.customerSalesOrderResource.fromDate = new Date(strArray[1]);
            this.customerSalesOrderResource.toDate = this.ToDateFilter;
          } else {
            this.customerSalesOrderResource.fromDate = null;
            this.customerSalesOrderResource.toDate = null;
          }
        } else if (strArray[0] === 'toDate') {
          if (strArray[1] != 'null') {
            this.customerSalesOrderResource.toDate = new Date(strArray[1]);
            this.customerSalesOrderResource.fromDate = this.FromDateFilter;
          } else {
            this.customerSalesOrderResource.fromDate = null;
            this.customerSalesOrderResource.toDate = null;
          }
        } else if (strArray[0] === 'soCreatedDate') {
          if (strArray[1] != 'null') {
            this.customerSalesOrderResource.soCreatedDate = new Date(strArray[1]);
          } else {
            this.customerSalesOrderResource.soCreatedDate = null;
          }
        } else if (strArray[0] === 'orderNumber') {
          this.customerSalesOrderResource.orderNumber = strArray[1];
        } else if (strArray[0] === 'customerName') {
          this.customerSalesOrderResource.customerName = strArray[1];
        } else if (strArray[0] === 'paymentStatus') {
          this.customerSalesOrderResource.paymentStatus = strArray[1];
        }
        this.customerSalesOrderStore.loadByQuery(this.customerSalesOrderResource);
      });
  }

  customerNameControlOnChange() {
    this.customerList$ = this.customerNameControl.valueChanges.pipe(
      debounceTime(1000),
      distinctUntilChanged(),
      switchMap((c: string | null) => {
        return this.customerService.getCustomersForDropDown(c ?? '');
      })
    );
  }

  refresh() {
    this.customerSalesOrderStore.loadByQuery(this.customerSalesOrderResource);
  }

  clearDates() {
    this.FromDateFilter = null;
    this.ToDateFilter = null;
  }

  ngAfterViewInit() {
    this.sort.sortChange.subscribe(() => (this.paginator.pageIndex = 0));

    this.sub$.sink = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        tap(() => {
          this.customerSalesOrderResource.skip = this.paginator.pageIndex * this.paginator.pageSize;
          this.customerSalesOrderResource.pageSize = this.paginator.pageSize;
          this.customerSalesOrderResource.orderBy = this.sort.active + ' ' + this.sort.direction;
          this.customerSalesOrderStore.loadByQuery(this.customerSalesOrderResource);
        })
      )
      .subscribe();
  }

  toggleRow(element: CustomerSalesOrder) {
    this.expandedElement = this.expandedElement === element ? null : element;
    this.cd.detectChanges();
  }

  addPendingPayment(element?: CustomerSalesOrder | null) {
    const dialogRef = this.dialog.open(ManageCustomerLadger, {
      minWidth: '50vw',
      direction: this.langDir,
      data: { customerId: element?.customerId },
    });
    dialogRef.afterClosed().subscribe((data: boolean) => {
      if (data) {
        this.customerSalesOrderStore.loadByQuery(this.customerSalesOrderResource);
      }
    });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.customerSalesOrderStore.customerSalesOrders().indexOf(row);
  }
}
