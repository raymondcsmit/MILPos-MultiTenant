import { ChangeDetectorRef, Component, inject, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import { SalesOrderReturnStore } from '../sale-order-return-store';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatTableModule } from '@angular/material/table';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { SaleOrderReturnItemComponent } from '../sale-order-return-item/sale-order-return-item.component';
import { SalesOrderInvoiceComponent } from '@shared/sales-order-invoice/sales-order-invoice.component';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { PaymentStatusPipe } from '@shared/pipes/payment-status.pipe';
import { MatButtonModule } from '@angular/material/button';
import { AsyncPipe, NgClass } from '@angular/common';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { BaseComponent } from '../../base.component';
import { SalesOrderService } from '../../sales-order/sales-order.service';
import { CustomerService } from '../../customer/customer.service';
import { AddSalesOrderPaymentComponent } from '../../sales-order/add-sales-order-payment/add-sales-order-payment.component';
import { ViewSalesOrderPaymentComponent } from '../../sales-order/view-sales-order-payment/view-sales-order-payment.component';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-sale-order-return-list',
  templateUrl: './sale-order-return-list.component.html',
  styleUrls: ['./sale-order-return-list.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatAutocompleteModule,
    HasClaimDirective,
    MatIconModule,
    MatMenuModule,
    SaleOrderReturnItemComponent,
    SalesOrderInvoiceComponent,
    UTCToLocalTime,
    PaymentStatusPipe,
    RouterModule,
    MatButtonModule,
    NgClass,
    CustomCurrencyPipe,
    FormsModule,
    AsyncPipe,
    ReactiveFormsModule,
    MatCardModule
  ],
})
export class SaleOrderReturnListComponent
  extends BaseComponent
  implements OnInit {
  displayedColumns: string[] = [
    'action',
    'modifiedDate',
    'orderNumber',
    'paymentStatus',
    'businessLocation',
    'customerName',
    'totalDiscount',
    'totalTax',
    'totalAmount',
    'totalPaidAmount',
    'soCreatedDate',
    'deliveryDate',
  ];
  filterColumns: string[] = [
    'action-search',
    'modifiedDate-search',
    'orderNumber-search',
    'paymentStatus-search',
    'businessLocation-search',
    'customer-search',
    'totalDiscount-search',
    'totalTax-search',
    'totalAmount-search',
    'totalPaidAmount-search',
    'soCreatedDate-search',
    'deliverDate-search',
  ];
  footerToDisplayed: string[] = ['footer'];
  salesOrderReturnStore = inject(SalesOrderReturnStore);
  salesOrderResource: SalesOrderResourceParameter = { ... this.salesOrderReturnStore.salesOrderResourceParameter() };
  isLoading = this.salesOrderReturnStore.isLoading();
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  _customerFilter: string = this.salesOrderResource.customerName ?? '';
  _orderNumberFilter: string = this.salesOrderResource.orderNumber ?? '';
  customerNameControl: FormControl<string | null> = new FormControl<string>({ value: this.salesOrderResource.customerName ?? '', disabled: false });
  customerList$!: Observable<Customer[]>;
  expandedElement!: SalesOrder | null;
  public filterObservable$: Subject<string> = new Subject<string>();
  salesOrderForInvoice!: SalesOrder;

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
  orderByColumn: string = '';
  orderByDirection: SortDirection = 'asc';
  constructor(
    private salesOrderService: SalesOrderService,
    private customerService: CustomerService,
    private cd: ChangeDetectorRef,
    private commonDialogService: CommonDialogService,
    private router: Router,
    private dialog: MatDialog,
  ) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {

    const orderBy = this.salesOrderReturnStore.salesOrderResourceParameter()?.orderBy?.split(" ");

    if (orderBy?.length) {
      this.orderByColumn = orderBy[0];
      this.orderByDirection = (orderBy[1]?.toLowerCase() === 'desc' ? 'desc' : 'asc');
    }

    this.customerNameControlOnChange();
    this.sub$.sink = this.filterObservable$
      .pipe(debounceTime(1000), distinctUntilChanged())
      .subscribe((c) => {
        this.salesOrderResource.skip = 0;
        this.paginator.pageIndex = 0;
        const strArray: Array<string> = c.split(':');
        if (strArray[0] === 'customerName') {
          this.salesOrderResource.customerName = strArray[1];
        } else if (strArray[0] === 'orderNumber') {
          this.salesOrderResource.orderNumber = strArray[1];
        }
        this.salesOrderReturnStore.loadByQuery(this.salesOrderResource);
      });
  }
  refresh() {
    this.salesOrderReturnStore.loadByQuery(this.salesOrderResource);
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
          this.salesOrderReturnStore.loadByQuery(this.salesOrderResource);
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
          this.salesOrderReturnStore.deleteSalesOrderById(salesOrder.id ?? '');
        }
      });
  }

  addPayment(salesOrder: SalesOrder): void {
    const dialogRef = this.dialog.open(AddSalesOrderPaymentComponent, {
      width: '100vh',
      data: Object.assign({}, salesOrder),
    });
    dialogRef.afterClosed().subscribe((isAdded: boolean) => {
      if (isAdded) {
        this.salesOrderReturnStore.loadByQuery(this.salesOrderResource);
      }
    });
  }

  viewPayment(salesOrder: SalesOrder) {
    const dialogRef = this.dialog.open(ViewSalesOrderPaymentComponent, {
      data: Object.assign({}, salesOrder),
    });
    dialogRef.afterClosed().subscribe((isAdded: boolean) => {
      if (isAdded) {
        this.salesOrderReturnStore.loadByQuery(this.salesOrderResource);
      }
    });
  }

  onSaleOrderReturn(saleOrder: SalesOrder) {
    this.router.navigate(['sales-order-return', saleOrder.id]);
  }

  generateInvoice(so: SalesOrder) {
    this.salesOrderService
      .getSalesOrderById(so.id ?? '')
      .subscribe((purchaserOrder) => {
        this.salesOrderForInvoice = purchaserOrder;
      });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.salesOrderReturnStore.salesOrders().indexOf(row);
  }
}
