import { AfterViewInit, ChangeDetectorRef, Component, inject, ViewChild } from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule, SortDirection } from '@angular/material/sort';
import { Router, RouterModule } from '@angular/router';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';
import { PurchaseOrderResourceParameter } from '@core/domain-classes/purchase-order-resource-parameter';
import { Supplier } from '@core/domain-classes/supplier';
import { merge, Observable, Subject } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  tap,
} from 'rxjs/operators';
import { AddPurchaseOrderPaymentsComponent } from '../add-purchase-order-payments/add-purchase-order-payments.component';
import { PurchaseOrderService } from '../purchase-order.service';
import { ViewPurchaseOrderPaymentComponent } from '../view-purchase-order-payment/view-purchase-order-payment.component';
import { SendEmailComponent } from '@shared/send-email/send-email.component';
import { PurchaseOrderStore } from '../purchase-order-store';
import { PurchaseDeliveryStatus, purchaseDeliveryStatuses } from '@core/domain-classes/purchase-delivery-status';
import { PaymentStatus, paymentStatuses } from '@core/domain-classes/paymentaStatus';
import { CommonService } from '@core/services/common.service';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatTableModule } from '@angular/material/table';
import { AsyncPipe, NgClass, NgStyle } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { BaseComponent } from '../../base.component';
import { TableSettingsStore } from '../../table-setting/table-setting-store';
import { SupplierService } from '../../supplier/supplier.service';
import { PurchaseOrderInvoiceComponent } from '@shared/purchase-order-invoice/purchase-order-invoice.component';
import { PurchaseOrderItemComponent } from '../purchase-order-item/purchase-order-item.component';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { PaymentStatusPipe } from '@shared/pipes/payment-status.pipe';
import { PurchaseDeliveryStatusPipe } from '@shared/pipes/purchase-delivery-status.pipe';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from '@core/services/toastr.service';

@Component({
  selector: 'app-purchase-order-list',
  templateUrl: './purchase-order-list.component.html',
  styleUrls: ['./purchase-order-list.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatIconModule,
    MatMenuModule,
    HasClaimDirective,
    PurchaseOrderInvoiceComponent,
    PurchaseOrderItemComponent,
    MatAutocompleteModule,
    ReactiveFormsModule,
    MatSelectModule,
    FormsModule,
    MatDatepickerModule,
    PaymentStatusPipe,
    PurchaseDeliveryStatusPipe,
    RouterModule,
    CustomCurrencyPipe,
    UTCToLocalTime,
    MatButtonModule,
    MatCardModule,
    MatTooltipModule,
    AsyncPipe,
    NgClass,
    NgStyle
  ]
})
export class PurchaseOrderListComponent extends BaseComponent implements AfterViewInit {
  displayedColumns: string[] = [
    'action',
    'poCreatedDate',
    'orderNumber',
    'deliveryStatus',
    'paymentStatus',
    'businessLocation',
    'supplierName',
    'totalDiscount',
    'totalTax',
    'totalAmount',
    'totalPaidAmount',
    'totalRefundAmount',
    'deliveryDate',
    'modifiedDate',
    'createdByName',
    'status',
  ];
  filterColumns: string[] = [
    'poCreatedDate-search',
    'orderNumber-search',
    'deliveryStatus-search',
    'paymentStatus-search',
    'businessLocation-search',
    'supplier-search',
    'totalAmount-search',
    'totalDiscount-search',
    'totalTax-search',
    'totalPaidAmount-search',
    'totalRefundAmount-search',
    'deliverDate-search',
    'deliverDate-search',
    'modifiedDate-search',
    'status-search',
  ];
  footerToDisplayed: string[] = ['footer'];
  purchaseOrderStore = inject(PurchaseOrderStore);
  tableSettingsStore = inject(TableSettingsStore);
  purchaseOrderResource: PurchaseOrderResourceParameter = { ...this.purchaseOrderStore.purchaseOrderResourceParameter() };
  loading$!: Observable<boolean>;
  loading = this.purchaseOrderStore.isLoading();
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  supplierNameControl: UntypedFormControl = new UntypedFormControl();
  supplierList$!: Observable<Supplier[]>;
  expandedElement!: PurchaseOrder | null;
  public filterObservable$: Subject<string> = new Subject<string>();
  isSendEmail: boolean = false;
  deliveryStatuses: PurchaseDeliveryStatus[] = purchaseDeliveryStatuses;
  paymentStatuses: PaymentStatus[] = paymentStatuses;
  locations: BusinessLocation[] = [];
  _supplierFilter: string = this.purchaseOrderResource.supplierName ?? '';
  _orderNumberFilter: string = this.purchaseOrderResource.orderNumber ?? '';
  _fromOrderDateFilter: Date | null = this.purchaseOrderResource.fromDate ?? null;
  _toOrderDateFilter: Date | null = this.purchaseOrderResource.toDate ?? null;

  get visibleTableKeys(): string[] {
    return this.tableSettingsStore.purchaseOrdersTableSettingsVisible().map(c => c.key);
  }

  get visibleTableKeysSearch(): string[] {
    return this.tableSettingsStore.purchaseOrdersTableSettingsVisible().map(c => c.key + '-search');
  }

  purchaseOrderForInvoice!: PurchaseOrder | null;
  public get SupplierFilter(): string {
    return this._supplierFilter;
  }
  public set SupplierFilter(v: string) {
    if (this._supplierFilter !== v) {
      this._supplierFilter = v;
      const supplierFilter = `supplierName#${v}`;
      this.filterObservable$.next(supplierFilter);
    }
  }

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

  public get OrderFromDateFilter(): Date | null {
    return this._fromOrderDateFilter;
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

  private _purchaseStatus!: string;
  public get purchaseStatusFilter(): string {
    return this._purchaseStatus ?? '';
  }
  public set purchaseStatusFilter(v: string) {
    if (this._purchaseStatus !== v) {
      this._purchaseStatus = v;
      const purchaseStatusFilerValue = `purchaseStatus#${v}`;
      this.filterObservable$.next(purchaseStatusFilerValue);
    }
  }
  private _paymentStatusFilter!: string;
  public get paymentStatusFilter(): string {
    return this._paymentStatusFilter;
  }
  public set paymentStatusFilter(v: string) {
    if (this._paymentStatusFilter !== v) {
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

  orderByColumn: string = '';
  orderByDirection: SortDirection = 'asc';

  constructor(
    private purchaseOrderService: PurchaseOrderService,
    private supplierService: SupplierService,
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

  ngOnInit(): void {
    const orderBy = this.purchaseOrderStore.purchaseOrderResourceParameter()?.orderBy?.split(" ");
    if (orderBy?.length) {
      this.orderByColumn = orderBy[0];
      this.orderByDirection = (orderBy[1]?.toLowerCase() === 'desc' ? 'desc' : 'asc');
    }
    this._fromOrderDateFilter = this.purchaseOrderResource.fromDate ?? null;
    this._toOrderDateFilter = this.purchaseOrderResource.toDate ?? null;
    this._purchaseStatus = this.purchaseOrderResource.deliveryStatus ?? '';
    this._paymentStatusFilter = this.purchaseOrderResource.paymentStatus ?? '';
    this._locationFilter = this.purchaseOrderResource.locationId ?? '';
    this._supplierFilter = this.purchaseOrderResource.supplierName ?? '';
    this.supplierNameControl.setValue(this.purchaseOrderResource.supplierName);

    this.supplierNameControlOnChange();
    this.getResourceParameter();
    this.getBusinessLocations();
    this.sub$.sink = this.filterObservable$
      .pipe(debounceTime(1000), distinctUntilChanged())
      .subscribe((c) => {
        this.purchaseOrderResource.skip = 0;
        this.paginator.pageIndex = 0;
        const strArray: Array<string> = c.split('#');
        if (strArray[0] === 'supplierName') {
          this.purchaseOrderResource.supplierName = strArray[1];
        } else if (strArray[0] === 'orderNumber') {
          this.purchaseOrderResource.orderNumber = strArray[1];
        } else if (strArray[0] === 'fromDate') {
          if (strArray[1] != 'null') {
            this.purchaseOrderResource.fromDate = new Date(strArray[1]);
            this.purchaseOrderResource.toDate = this.OrderToDateFilter;
          } else {
            this.purchaseOrderResource.fromDate = null;
            this.purchaseOrderResource.toDate = null;
          }
        } else if (strArray[0] === 'toDate') {
          if (strArray[1] != 'null') {
            this.purchaseOrderResource.toDate = new Date(strArray[1]);
            this.purchaseOrderResource.fromDate = this.OrderFromDateFilter;
          } else {
            this.purchaseOrderResource.fromDate = null;
            this.purchaseOrderResource.toDate = null;
          }
        } else if (strArray[0] === 'purchaseStatus') {
          this.purchaseOrderResource.deliveryStatus = strArray[1];
        } else if (strArray[0] === 'paymentStatus') {
          this.purchaseOrderResource.paymentStatus = strArray[1];
        } else if (strArray[0] === 'locationId') {
          this.purchaseOrderResource.locationId = strArray[1];
        }
        this.purchaseOrderStore.loadByQuery(this.purchaseOrderResource);
      });
  }

  onTableRefresh() {
    this.router.navigate([`/table-settings/PurchaseOrders`]);
  }

  refresh() {
    this.purchaseOrderStore.loadByQuery(this.purchaseOrderResource);
  }

  clearOrderDates() {
    this.OrderFromDateFilter = null;
    this.OrderToDateFilter = null;
  }

  supplierNameControlOnChange() {
    this.supplierList$ = this.supplierNameControl.valueChanges.pipe(
      debounceTime(1000),
      distinctUntilChanged(),
      switchMap((c) => {
        return this.supplierService.getSuppliersForDropDown(c);
      })
    );
  }

  getBusinessLocations() {
    this.commonService.getLocationsForReport().subscribe((locationResponse) => {
      this.locations = locationResponse.locations;
    });
  }

  ngAfterViewInit() {
    this.sort.sortChange.subscribe(() => (this.paginator.pageIndex = 0));

    this.sub$.sink = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        tap(() => {
          this.purchaseOrderResource.skip =
            this.paginator.pageIndex * this.paginator.pageSize;
          this.purchaseOrderResource.pageSize = this.paginator.pageSize;
          this.purchaseOrderResource.orderBy =
            this.sort.active + ' ' + this.sort.direction;
          this.purchaseOrderStore.loadByQuery(this.purchaseOrderResource);
        })
      )
      .subscribe();
  }

  getResourceParameter() {
    this.OrderNumberFilter = this.purchaseOrderResource.orderNumber ?? '';
    this.SupplierFilter = this.purchaseOrderResource.supplierName ?? '';
  }

  toggleRow(element: PurchaseOrder) {
    this.expandedElement = this.expandedElement === element ? null : element;
    this.cd.detectChanges();
  }

  poChangeEvent(purchaseOrder: PurchaseOrder) {
    this.toggleRow(purchaseOrder);
  }

  deletePurchaseOrder(purchaseOrder: PurchaseOrder) {
    this.commonDialogService
      .deleteConformationDialog(
        this.translationService.getValue('ARE_YOU_SURE_YOU_WANT_TO_DELETE')
      )
      .subscribe((isYes) => {
        if (isYes) {
          this.purchaseOrderStore.deletePurchaseOrderById(purchaseOrder.id ?? '');
        }
      });
  }

  addPayment(purchaseOrder: PurchaseOrder): void {
    const dialogRef = this.dialog.open(AddPurchaseOrderPaymentsComponent, {
      width: '100vh',
      // direction: this.langDir,
      data: Object.assign({}, purchaseOrder),
    });
    dialogRef.afterClosed().subscribe((isAdded: boolean) => {
      if (isAdded) {
        this.purchaseOrderStore.loadByQuery(this.purchaseOrderResource);
      }
    });
  }

  viewPayment(purchaseOrder: PurchaseOrder) {
    const dialogRef = this.dialog.open(ViewPurchaseOrderPaymentComponent, {
      maxWidth: '90vw',
      data: Object.assign({}, purchaseOrder),
    });
    dialogRef.afterClosed().subscribe((isAdded: boolean) => {
      if (isAdded) {
        this.purchaseOrderStore.loadByQuery(this.purchaseOrderResource);
      }
    });
  }

  OnPurchaseOrderReturn(purchaseOrder: PurchaseOrder) {
    this.router.navigate(['/purchase-order-return', purchaseOrder.id]);
  }
  generateInvoice(po: PurchaseOrder) {
    this.purchaseOrderForInvoice = null;
    this.isSendEmail = false;
    this.getPurchaseOrderById(po.id ?? '');
  }
  sendEmail(po: PurchaseOrder) {
    this.purchaseOrderForInvoice = null;
    this.isSendEmail = true;
    this.getPurchaseOrderById(po.id ?? '');
  }
  getPurchaseOrderById(id: string) {
    this.purchaseOrderService
      .getPurchaseOrderById(id)
      .subscribe((purchaserOrder: PurchaseOrder) => {
        this.purchaseOrderForInvoice = purchaserOrder;
      });
  }

  markAsReceived(id: string) {
    this.commonDialogService
      .deleteConformationDialog(
        this.translationService.getValue(
          'ARE_YOU_SURE_YOU_WANT_TO_MARK_AS_RECEIVED'
        )
      )
      .subscribe((isYes) => {
        if (isYes) {
          this.purchaseOrderStore.markAsReceived(id);
        }
      });
  }
  onEmailBlob(event: string) {
    const dialogRef = this.dialog.open(SendEmailComponent, {
      data: Object.assign({}, { blob: event, name: `${this.purchaseOrderForInvoice?.orderNumber}.pdf`, contentType: 'application/pdf', subject: `${this.purchaseOrderForInvoice?.orderNumber}::${this.translationService.getValue('PURCHASE_ORDER')}` }),
      // direction: this.langDir,
      minWidth: '40vw',
    });
    dialogRef.afterClosed().subscribe(() => {
      this.purchaseOrderForInvoice = null;
    });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.purchaseOrderStore.purchaseOrders().indexOf(row);
  }
}
