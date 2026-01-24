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
import { SendEmailComponent } from '@shared/send-email/send-email.component';
import { Observable, Subject, debounceTime, distinctUntilChanged, switchMap, merge, tap } from 'rxjs';
import { SalesOrderRequestStore } from '../sales-order-request-store';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatTableModule } from '@angular/material/table';
import { SalesOrderRequestItemsComponent } from './sales-order-request-items/sales-order-request-items.component';
import { SalesOrderInvoiceComponent } from '@shared/sales-order-invoice/sales-order-invoice.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BaseComponent } from '../../base.component';
import { SalesOrderService } from '../../sales-order/sales-order.service';
import { CustomerService } from '../../customer/customer.service';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { AsyncPipe, NgClass } from '@angular/common';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { MatCardModule } from '@angular/material/card';
import { ToastrService } from '@core/services/toastr.service';

@Component({
  selector: 'app-sales-order-request-list',
  templateUrl: './sales-order-request-list.component.html',
  styleUrl: './sales-order-request-list.component.scss',
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    SalesOrderRequestItemsComponent,
    SalesOrderInvoiceComponent,
    RouterModule,
    MatMenuModule,
    MatIconModule,
    MatButtonModule,
    MatAutocompleteModule,
    ReactiveFormsModule,
    FormsModule,
    CustomCurrencyPipe,
    UTCToLocalTime,
    MatSortModule,
    HasClaimDirective,
    MatCardModule,
    AsyncPipe,
    NgClass
  ]
})
export class SalesOrderRequestListComponent extends BaseComponent implements OnInit {
  isSendEmail: boolean = false;
  displayedColumns: string[] = [
    'action',
    'soCreatedDate',
    'orderNumber',
    'deliveryDate',
    'businessLocation',
    'customerName',
    'totalDiscount',
    'totalTax',
    'totalAmount',
  ];
  filterColumns: string[] = [
    'action-search',
    'soCreatedDate-search',
    'orderNumber-search',
    'deliverDate-search',
    'businessLocation-search',
    'customer-search',
    'totalAmount-search',
    'totalDiscount-search',
    'totalTax-search',
  ];
  footerToDisplayed: string[] = ['footer'];
  salesOrderRequestStore = inject(SalesOrderRequestStore);
  salesOrderResource: SalesOrderResourceParameter = { ...this.salesOrderRequestStore.salesOrderResourceParameter() };
  isLoading = this.salesOrderRequestStore.isLoading();
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  _customerFilter = this.salesOrderResource.customerName;
  _orderNumberFilter = this.salesOrderResource.orderNumber;
  customerNameControl!: any;
  customerList$!: Observable<Customer[]>;
  expandedElement!: SalesOrder | null;
  public filterObservable$: Subject<string> = new Subject<string>();
  salesOrderForInvoice!: SalesOrder | null;

  public get CustomerFilter(): string {
    return this._customerFilter ?? '';
  }

  public set CustomerFilter(v: string) {
    if (this._customerFilter !== v) {
      this._customerFilter = v;
      const customerFilter = `customerName:${v}`;
      this.filterObservable$.next(customerFilter);
    }
  }

  public get OrderNumberFilter(): string {
    return this._orderNumberFilter ?? '';
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
    private toastrService: ToastrService,
  ) {
    super();
    this.getLangDir();
    this.customerNameControl = new FormControl<string>({ value: this.salesOrderResource.customerName ?? '', disabled: false });
  }

  ngOnInit(): void {
    const orderBy = this.salesOrderRequestStore.salesOrderResourceParameter()?.orderBy?.split(" ");
    if (orderBy?.length) {
      this.orderByColumn = orderBy[0];
      this.orderByDirection = (orderBy[1]?.toLowerCase() === 'desc' ? 'desc' : 'asc');
    }
    this.OrderNumberFilter = this.salesOrderResource.orderNumber ?? '';
    this.CustomerFilter = this.salesOrderResource.customerName ?? '';
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
        this.salesOrderRequestStore.loadByQuery(this.salesOrderResource);
      });
  }

  refresh() {
    this.salesOrderRequestStore.loadByQuery(this.salesOrderResource);
  }

  customerNameControlOnChange() {
    this.customerList$ = this.customerNameControl.valueChanges.pipe(
      debounceTime(1000),
      switchMap((c: string) => {
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
          this.salesOrderRequestStore.loadByQuery(this.salesOrderResource);
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
          this.salesOrderRequestStore.deleteSalesOrderById(salesOrder.id ?? '');
        }
      });
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

  editSalesOrder(salesOrder: SalesOrder) {
    this.router.navigate(['sales-order-request/', salesOrder.id]);
  }

  convertToSalesOrder(salesOrder: SalesOrder) {
    this.router.navigate(['sales-order/add'], {
      queryParams: { 'sales-order-requestId': salesOrder.id },
    });
  }

  onEmailBlob(event: string) {
    const dialogRef = this.dialog.open(SendEmailComponent, {
      data: Object.assign({}, { blob: event, name: `${this.salesOrderForInvoice ? this.salesOrderForInvoice.orderNumber : ''}.pdf`, contentType: 'application/pdf', subject: `${this.salesOrderForInvoice ? this.salesOrderForInvoice.orderNumber : ''}::${this.translationService.getValue('SALES_ORDER_REQUEST')}` }),
      direction: this.langDir,
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
    return this.salesOrderRequestStore.salesOrders().indexOf(row);
  }
}
