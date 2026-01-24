import { AfterViewInit, ChangeDetectorRef, Component, inject, ViewChild } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import { PurchaseOrderReturnStore } from '../purchase-order-request-store';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatTableModule } from '@angular/material/table';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { AsyncPipe, NgClass } from '@angular/common';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { PaymentStatusPipe } from '@shared/pipes/payment-status.pipe';
import { PurchaseOrderReturnItemComponent } from '../purchase-order-return-item/purchase-order-return-item.component';
import { PurchaseOrderInvoiceComponent } from '@shared/purchase-order-invoice/purchase-order-invoice.component';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { BaseComponent } from '../../base.component';
import { PurchaseOrderService } from '../../purchase-order/purchase-order.service';
import { SupplierService } from '../../supplier/supplier.service';
import { AddPurchaseOrderPaymentsComponent } from '../../purchase-order/add-purchase-order-payments/add-purchase-order-payments.component';
import { ViewPurchaseOrderPaymentComponent } from '../../purchase-order/view-purchase-order-payment/view-purchase-order-payment.component';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-purchase-order-return-list',
  templateUrl: './purchase-order-return-list.component.html',
  styleUrls: ['./purchase-order-return-list.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    HasClaimDirective,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    RouterModule,
    UTCToLocalTime,
    NgClass,
    CustomCurrencyPipe,
    PaymentStatusPipe,
    PurchaseOrderReturnItemComponent,
    PurchaseOrderInvoiceComponent,
    FormsModule,
    MatAutocompleteModule,
    AsyncPipe,
    ReactiveFormsModule,
    MatCardModule
  ]

})
export class PurchaseOrderReturnListComponent extends BaseComponent implements AfterViewInit {
  displayedColumns: string[] = [
    'action',
    'modifiedDate',
    'orderNumber',
    'paymentStatus',
    'businessLocation',
    'supplierName',
    'totalDiscount',
    'totalTax',
    'totalAmount',
    'totalPaidAmount',
    'poCreatedDate',
    'deliveryDate',

  ];
  filterColumns: string[] = [
    'action-search',
    'modifiedDate-search',
    'orderNumber-search',
    'paymentStatus-search',
    'businessLocation-search',
    'supplier-search',
    'totalAmount-search',
    'totalDiscount-search',
    'totalTax-search',
    'totalPaidAmount-search',
    'poCreatedDate-search',
    'deliverDate-search',
  ];
  footerToDisplayed: string[] = ['footer'];
  purchaseOrderReturnStore = inject(PurchaseOrderReturnStore);
  purchaseOrderResource: PurchaseOrderResourceParameter = { ...this.purchaseOrderReturnStore.purchaseOrderResourceParameter() };
  loading$!: Observable<boolean>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  _supplierFilter: string = this.purchaseOrderResource.supplierName ?? '';
  _orderNumberFilter: string = this.purchaseOrderResource.orderNumber ?? '';
  supplierNameControl: FormControl<string | null> = new FormControl<string>({ value: this.purchaseOrderResource.supplierName ?? '', disabled: false });
  supplierList$!: Observable<Supplier[]>;
  expandedElement!: PurchaseOrder | null;
  public filterObservable$: Subject<string> = new Subject<string>();
  purchaseOrderForInvoice!: PurchaseOrder | null;
  public get SupplierFilter(): string {
    return this._supplierFilter;
  }
  public set SupplierFilter(v: string) {
    if (this._supplierFilter !== v) {
      this._supplierFilter = v;
      const supplierFilter = `supplierName:${v}`;
      this.filterObservable$.next(supplierFilter);
    }
  }

  public get OrderNumberFilter(): string {
    return this._orderNumberFilter;
  }

  public set OrderNumberFilter(v: string) {
    if (this._orderNumberFilter !== v) {
      this._orderNumberFilter = v;
      const orderNumberFilter = `orderNumber:${v}`;
      this.filterObservable$.next(orderNumberFilter);
    }
  }
  orderByColumn: string = 'modifiedDate';
  orderByDirection: SortDirection = 'desc';

  constructor(
    private purchaseOrderService: PurchaseOrderService,
    private supplierService: SupplierService,
    private cd: ChangeDetectorRef,
    private commonDialogService: CommonDialogService,
    private router: Router,
    private dialog: MatDialog,
  ) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {

    const orderBy = this.purchaseOrderReturnStore.purchaseOrderResourceParameter()?.orderBy?.split(" ");

    if (orderBy?.length) {
      this.orderByColumn = orderBy[0];
      this.orderByDirection = (orderBy[1]?.toLowerCase() === 'desc' ? 'desc' : 'asc');
    }

    this.supplierNameControlOnChange();
    this.sub$.sink = this.filterObservable$
      .pipe(debounceTime(1000), distinctUntilChanged())
      .subscribe((c) => {
        this.purchaseOrderResource.skip = 0;
        this.paginator.pageIndex = 0;
        const strArray: Array<string> = c.split(':');
        if (strArray[0] === 'supplierName') {
          this.purchaseOrderResource.supplierName = strArray[1];
        } else if (strArray[0] === 'orderNumber') {
          this.purchaseOrderResource.orderNumber = strArray[1];
        }
        this.purchaseOrderReturnStore.loadByQuery(this.purchaseOrderResource);
      });
  }
  refresh() {
    this.purchaseOrderReturnStore.loadByQuery(this.purchaseOrderResource);
  }

  supplierNameControlOnChange() {
    this.supplierList$ = this.supplierNameControl.valueChanges.pipe(
      debounceTime(1000),
      distinctUntilChanged(),
      switchMap((c: string | null) => {
        return this.supplierService.getSuppliersForDropDown(c ?? '');
      })
    );
  }

  ngAfterViewInit() {
    this.sort.sortChange.subscribe(() => (this.paginator.pageIndex = 0));
    this.sub$.sink = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        tap((c: any) => {
          this.purchaseOrderResource.skip =
            this.paginator.pageIndex * this.paginator.pageSize;
          this.purchaseOrderResource.pageSize = this.paginator.pageSize;
          this.purchaseOrderResource.orderBy =
            this.sort.active + ' ' + this.sort.direction;
          this.purchaseOrderReturnStore.loadByQuery(this.purchaseOrderResource);
        })
      )
      .subscribe();
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
          this.purchaseOrderReturnStore.deletePurchaseOrderById(purchaseOrder.id ?? '');
        }
      });
  }

  addPayment(purchaseOrder: PurchaseOrder): void {
    const dialogRef = this.dialog.open(AddPurchaseOrderPaymentsComponent, {
      width: '100vh',
      data: Object.assign({}, purchaseOrder),
    });
    dialogRef.afterClosed().subscribe((isAdded: boolean) => {
      if (isAdded) {
        this.purchaseOrderReturnStore.loadByQuery(this.purchaseOrderResource);
      }
    });
  }

  viewPayment(purchaseOrder: PurchaseOrder) {
    const dialogRef = this.dialog.open(ViewPurchaseOrderPaymentComponent, {
      data: Object.assign({}, purchaseOrder),
    });
    dialogRef.afterClosed().subscribe((isAdded: boolean) => {
      if (isAdded) {
        this.purchaseOrderReturnStore.loadByQuery(this.purchaseOrderResource);
      }
    });
  }

  OnPurchaseOrderReturn(purchaseOrder: PurchaseOrder) {
    this.router.navigate(['/purchase-order-return', purchaseOrder.id]);
  }

  generateInvoice(po: PurchaseOrder) {
    this.purchaseOrderService
      .getPurchaseOrderById(po.id ?? '')
      .subscribe((purchaserOrder) => {
        this.purchaseOrderForInvoice = purchaserOrder;
      });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.purchaseOrderReturnStore.purchaseOrders().indexOf(row);
  }
}
