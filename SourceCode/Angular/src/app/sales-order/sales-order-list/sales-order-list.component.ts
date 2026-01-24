import { ChangeDetectorRef, Component, inject, OnInit, ViewChild } from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule, SortDirection } from '@angular/material/sort';
import { Router, RouterModule } from '@angular/router';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { Customer } from '@core/domain-classes/customer';
import { SalesOrder } from '@core/domain-classes/sales-order';
import { SalesOrderResourceParameter } from '@core/domain-classes/sales-order-resource-parameter';
import { merge, Observable, Subject } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  tap,
} from 'rxjs/operators';
import { AddSalesOrderPaymentComponent } from '../add-sales-order-payment/add-sales-order-payment.component';
import { SalesOrderService } from '../sales-order.service';
import { ViewSalesOrderPaymentComponent } from '../view-sales-order-payment/view-sales-order-payment.component';
import { SendEmailComponent } from '@shared/send-email/send-email.component';
import { SalesOrderStore } from '../sales-order-store';
import { SalesDeliveryStatus, salesDeliveryStatuses } from '@core/domain-classes/sales-delivery-statu';
import { PaymentStatus, paymentStatuses } from '@core/domain-classes/paymentaStatus';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { CommonService } from '@core/services/common.service';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatTableModule } from '@angular/material/table';
import { AsyncPipe, NgClass, NgStyle } from '@angular/common';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { SalesDeliveryStatusPipe } from '@shared/pipes/sales-delivery-status.pipe';
import { PaymentStatusPipe } from '@shared/pipes/payment-status.pipe';
import { SalesOrderInvoiceComponent } from '@shared/sales-order-invoice/sales-order-invoice.component';
import { SalesOrderItemsComponent } from './sales-order-items/sales-order-items.component';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { BaseComponent } from '../../base.component';
import { TableSettingsStore } from '../../table-setting/table-setting-store';
import { CustomerService } from '../../customer/customer.service';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from '@core/services/toastr.service';

@Component({
  selector: 'app-sales-order-list',
  templateUrl: './sales-order-list.component.html',
  styleUrls: ['./sales-order-list.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    HasClaimDirective,
    CustomCurrencyPipe,
    SalesDeliveryStatusPipe,
    PaymentStatusPipe,
    SalesOrderInvoiceComponent,
    SalesOrderItemsComponent,
    MatAutocompleteModule,
    MatSelectModule,
    MatDatepickerModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    UTCToLocalTime,
    HasClaimDirective,
    MatButtonModule,
    MatCardModule,
    NgStyle,
    NgClass,
    MatTooltipModule,
    AsyncPipe
  ]
})
export class SalesOrderListComponent extends BaseComponent implements OnInit {
  isSendEmail: boolean = false;
  salesDeliveryStatus: SalesDeliveryStatus[] = salesDeliveryStatuses;
  salesPaymentStatuses: PaymentStatus[] = paymentStatuses;
  displayedColumns: string[] = [
    'action',
    'soCreatedDate',
    'orderNumber',
    'deliveryStatus',
    'paymentStatus',
    'businessLocation',
    'customerName',
    'totalDiscount',
    'totalTax',
    'totalAmount',
    'totalPaidAmount',
    'deliveryDate',
    'modifiedDate',
    'createdByName',
    'status',
  ];
  filterColumns: string[] = [
    'soCreatedDate-search',
    'orderNumber-search',
    'deliveryStatus-search',
    'paymentStatus-search',
    'businessLocation-search',
    'customer-search',
    'totalAmount-search',
    'totalDiscount-search',
    'totalTax-search',
    'totalPaidAmount-search',
    'deliverDate-search',
    'modifiedDate-search',
    'createdByName-search',
    'status-search',
  ];
  footerToDisplayed: string[] = ['footer'];
  salesOrderStore = inject(SalesOrderStore);
  tableSettingsStore = inject(TableSettingsStore);
  salesOrderResource: SalesOrderResourceParameter = { ...this.salesOrderStore.salesOrderResourceParameter() };
  loading = this.salesOrderStore.isLoading();
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  _customerFilter: string = this.salesOrderResource.customerName ?? '';
  _orderNumberFilter: string = this.salesOrderResource.orderNumber ?? '';
  customerNameControl: UntypedFormControl = new UntypedFormControl();
  customerList$!: Observable<Customer[]>;
  expandedElement!: SalesOrder | null;
  public filterObservable$: Subject<string> = new Subject<string>();
  salesOrderForInvoice!: SalesOrder | null;

  locations: BusinessLocation[] = [];
  _fromOrderDateFilter: Date | null = this.salesOrderResource.fromDate ?? null;
  _toOrderDateFilter: Date | null = this.salesOrderResource.toDate ?? null;

  get visibleTableKeys(): string[] {
    return this.tableSettingsStore.saleOrdersTableSettingsVisible().map(c => c.key);
  }

  get visibleTableKeysSearch(): string[] {
    return this.tableSettingsStore.saleOrdersTableSettingsVisible().map(c => c.key + '-search');
  }


  public get CustomerFilter(): string {
    return this._customerFilter;
  }

  public set CustomerFilter(v: string) {
    if (this._customerFilter != v) {
      this._customerFilter = v;
      const customerFilter = `customerName#${v}`;
      this.filterObservable$.next(customerFilter);
    }
  }

  public get OrderNumberFilter(): string {
    return this._orderNumberFilter;
  }

  public set OrderNumberFilter(v: string) {
    if (this._orderNumberFilter != v) {
      this._orderNumberFilter = v;
      const orderNumberFilter = `orderNumber#${v}`;
      this.filterObservable$.next(orderNumberFilter);
    }
  }


  private _deliveryStatus!: string;
  public get deliveryStatusFilter(): string {
    return this._deliveryStatus ?? '';
  }
  public set deliveryStatusFilter(v: string) {
    if (this._deliveryStatus != v) {
      this._deliveryStatus = v;
      const deliveryStatusFilerValue = `deliveryStatus#${v}`;
      this.filterObservable$.next(deliveryStatusFilerValue);
    }
  }
  private _paymentStatusFilter!: string;
  public get paymentStatusFilter(): string {
    return this._paymentStatusFilter;
  }
  public set paymentStatusFilter(v: string) {
    if (this._paymentStatusFilter != v) {
      this._paymentStatusFilter = v;
      const paymentStatusFilerValue = `paymentStatus#${v}`;
      this.filterObservable$.next(paymentStatusFilerValue);
    }
  }
  private _locationFilter!: string;
  public get locationFilter(): string {
    return this._locationFilter;
  }
  public set locationFilter(v: string) {
    if (this._locationFilter !== v) {
      this._locationFilter = v;
      const locationFilterValue = `locationId#${v}`;
      this.filterObservable$.next(locationFilterValue);
    }
  }
  public get OrderFromDateFilter(): Date | null {
    return this._fromOrderDateFilter ?? null;
  }

  public set OrderFromDateFilter(v: Date | null) {
    if (this._fromOrderDateFilter !== v) {
      this._fromOrderDateFilter = v;
      const fromDateFilter = `fromDate#${v}`;
      this.filterObservable$.next(fromDateFilter);
    }
  }

  public get OrderToDateFilter(): Date | null {
    return this._toOrderDateFilter;
  }

  public set OrderToDateFilter(v: Date | null) {
    if (this._toOrderDateFilter !== v) {
      this._toOrderDateFilter = v;
      const toDateFilter = `toDate#${v}`;
      this.filterObservable$.next(toDateFilter);
    }
  }

  orderByColumn: string = '';
  orderByDirection: SortDirection = 'asc';

  constructor(
    private salesOrderService: SalesOrderService,
    private customerService: CustomerService,
    private cd: ChangeDetectorRef,
    private commonDialogService: CommonDialogService,
    private router: Router,
    private dialog: MatDialog,
    private commonService: CommonService,
    private toastrService: ToastrService
  ) {
    super();
    this.getLangDir();
  }

  onTableRefresh() {
    this.router.navigate([`/table-settings/SaleOrders`]);
  }

  ngOnInit(): void {
    const orderBy = this.salesOrderStore.salesOrderResourceParameter()?.orderBy?.split(" ");

    if (orderBy?.length) {
      this.orderByColumn = orderBy[0];
      this.orderByDirection = (orderBy[1]?.toLowerCase() === 'desc' ? 'desc' : 'asc');
    }
    this.CustomerFilter = this.salesOrderResource.customerName ?? '';
    this.OrderNumberFilter = this.salesOrderResource.orderNumber ?? '';
    this.deliveryStatusFilter = this.salesOrderResource.deliveryStatus ?? '';
    this.paymentStatusFilter = this.salesOrderResource.paymentStatus ?? '';
    this._customerFilter = this.salesOrderResource.customerName ?? '';
    this.customerNameControl.setValue(this.salesOrderResource.customerName);
    this._fromOrderDateFilter = this.salesOrderResource.fromDate ?? null;
    this._toOrderDateFilter = this.salesOrderResource.toDate ?? null;
    this._deliveryStatus = this.salesOrderResource.deliveryStatus ?? '';
    this._paymentStatusFilter = this.salesOrderResource.paymentStatus ?? '';
    this._locationFilter = this.salesOrderResource.locationId ?? '';

    this.customerNameControlOnChange();
    this.getBusinessLocations();
    this.sub$.sink = this.filterObservable$
      .pipe(debounceTime(1000), distinctUntilChanged())
      .subscribe((c) => {
        this.salesOrderResource.skip = 0;
        this.paginator.pageIndex = 0;
        const strArray: Array<string> = c.split('#');
        if (strArray[0] === 'customerName') {
          this.salesOrderResource.customerName = strArray[1];
        } else if (strArray[0] === 'orderNumber') {
          this.salesOrderResource.orderNumber = strArray[1];
        }
        else if (strArray[0] === 'fromDate') {
          if (strArray[1] != 'null') {
            this.salesOrderResource.fromDate = new Date(strArray[1]);
            this.salesOrderResource.toDate = this.OrderToDateFilter;
          } else {
            this.salesOrderResource.fromDate = null;
            this.salesOrderResource.toDate = null;
          }
        } else if (strArray[0] === 'toDate') {
          if (strArray[1] != 'null') {
            this.salesOrderResource.toDate = new Date(strArray[1]);
            this.salesOrderResource.fromDate = this.OrderFromDateFilter;
          } else {
            this.salesOrderResource.fromDate = null;
            this.salesOrderResource.toDate = null;
          }
        } else if (strArray[0] === 'deliveryStatus') {
          this.salesOrderResource.deliveryStatus = strArray[1];
        } else if (strArray[0] === 'paymentStatus') {
          this.salesOrderResource.paymentStatus = strArray[1];
        } else if (strArray[0] === 'locationId') {
          this.salesOrderResource.locationId = strArray[1];
        }
        this.salesOrderStore.loadByQuery(this.salesOrderResource);
      });
  }

  getBusinessLocations() {
    this.commonService.getLocationsForReport().subscribe((locationResposne) => {
      this.locations = locationResposne.locations;
    });
  }
  clearOrderDates() {
    this.OrderFromDateFilter = null;
    this.OrderToDateFilter = null;
  }

  refresh() {
    this.salesOrderStore.loadByQuery(this.salesOrderResource);
  }

  customerNameControlOnChange() {
    this.customerList$ = this.customerNameControl.valueChanges.pipe(
      debounceTime(1000),
      distinctUntilChanged(),
      switchMap((c) => {
        return this.customerService.getCustomersForDropDown(c);
      })
    );
  }

  ngAfterViewInit() {
    this.sort.sortChange.subscribe(() => (this.paginator.pageIndex = 0));

    this.sub$.sink = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        tap((c: any) => {
          this.salesOrderResource.skip =
            this.paginator.pageIndex * this.paginator.pageSize;
          this.salesOrderResource.pageSize = this.paginator.pageSize;
          this.salesOrderResource.orderBy =
            this.sort.active + ' ' + this.sort.direction;
          this.salesOrderStore.loadByQuery(this.salesOrderResource);
        })
      )
      .subscribe();
  }

  toggleRow(element: SalesOrder) {
    this.expandedElement = this.expandedElement === element ? null : element;
    this.cd.detectChanges();
  }

  deleteSalesOrder(salesOrder: SalesOrder) {
    this.commonDialogService
      .deleteConformationDialog(
        this.translationService.getValue('ARE_YOU_SURE_YOU_WANT_TO_DELETE')
      )
      .subscribe((isYes) => {
        if (isYes) {
          this.salesOrderStore.deleteSalesOrderById(salesOrder.id ?? '');
        }
      });
  }

  addPayment(salesOrder: SalesOrder): void {
    const dialogRef = this.dialog.open(AddSalesOrderPaymentComponent, {
      width: '60vw',
      data: Object.assign({}, salesOrder),
    });
    dialogRef.afterClosed().subscribe((isAdded: boolean) => {
      if (isAdded) {
        this.salesOrderStore.loadByQuery(this.salesOrderResource);
      }
    });
  }

  viewPayment(salesOrder: SalesOrder) {
    const dialogRef = this.dialog.open(ViewSalesOrderPaymentComponent, {
      data: Object.assign({}, salesOrder),
    });
    dialogRef.afterClosed().subscribe((isAdded: boolean) => {
      if (isAdded) {
        this.salesOrderStore.loadByQuery(this.salesOrderResource);
      }
    });
  }

  onSaleOrderReturn(saleOrder: SalesOrder) {
    this.router.navigate(['sales-order-return', saleOrder.id]);
  }

  generateInvoice(so: SalesOrder) {
    this.salesOrderForInvoice = null;
    this.isSendEmail = false;
    this.getSaleOrderById(so.id ?? '');
  }
  sendEmail(so: SalesOrder) {
    this.salesOrderForInvoice = null;
    this.isSendEmail = true;
    this.getSaleOrderById(so.id ?? '');
  }
  getSaleOrderById(id: string) {
    this.salesOrderService
      .getSalesOrderById(id)
      .subscribe((saleOrder: SalesOrder) => {
        this.salesOrderForInvoice = saleOrder;
      });
  }

  markAsDelivered(id: string) {
    this.commonDialogService
      .deleteConformationDialog(
        this.translationService.getValue(
          'ARE_YOU_SURE_YOU_WANT_TO_MARK_AS_DELIVERED'
        )
      )
      .subscribe((isYes) => {
        if (isYes) {
          this.salesOrderStore.markAsDelivered(id);
        }
      });
  }

  onEmailBlob(event: string) {
    const dialogRef = this.dialog.open(SendEmailComponent, {
      data: Object.assign({}, { blob: event, name: `${this.salesOrderForInvoice?.orderNumber}.pdf`, contentType: 'application/pdf', subject: `${this.salesOrderForInvoice?.orderNumber}::${this.translationService.getValue('SALES_ORDER')}` }),

      minWidth: '40vw',
    });
    dialogRef.afterClosed().subscribe(() => {
      this.salesOrderForInvoice = null;
    });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.salesOrderStore.salesOrders().indexOf(row);
  }
}
