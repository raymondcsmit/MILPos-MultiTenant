import { HttpResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import {
  FormsModule,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormControl,
  UntypedFormGroup,
} from '@angular/forms';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { Customer } from '@core/domain-classes/customer';
import { Product } from '@core/domain-classes/product';
import { ProductResourceParameter } from '@core/domain-classes/product-resource-parameter';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { SalesOrder } from '@core/domain-classes/sales-order';
import { SalesOrderResourceParameter } from '@core/domain-classes/sales-order-resource-parameter';
import { dateCompare } from '@core/services/date-range';
import { merge, Observable, Subject } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  tap,
} from 'rxjs/operators';
import * as XLSX from 'xlsx';
import { PaymentStatusPipe } from '@shared/pipes/payment-status.pipe';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { CommonService } from '@core/services/common.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SendEmailComponent } from '@shared/send-email/send-email.component';
import { MatDialog } from '@angular/material/dialog';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { SalesOrderItemsComponent } from './sales-order-items/sales-order-items.component';
import { SalesOrderInvoiceComponent } from '@shared/sales-order-invoice/sales-order-invoice.component';
import { RouterModule } from '@angular/router';
import { AsyncPipe, NgClass } from '@angular/common';
import { BaseComponent } from '../../base.component';
import { SalesOrderDataSource } from '../../sales-order/sales-order-datasource';
import { SalesOrderService } from '../../sales-order/sales-order.service';
import { CustomerService } from '../../customer/customer.service';
import { ProductService } from '../../product/product.service';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from '@core/services/toastr.service';

@Component({
  selector: 'app-sales-order-report',
  templateUrl: './sales-order-report.component.html',
  styleUrls: ['./sales-order-report.component.scss'],
  providers: [UTCToLocalTime, CustomCurrencyPipe, PaymentStatusPipe],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    ReactiveFormsModule,
    TranslateModule,
    MatSelectModule,
    MatDatepickerModule,
    MatDividerModule,
    MatMenuModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    SalesOrderItemsComponent,
    SalesOrderInvoiceComponent,
    UTCToLocalTime,
    RouterModule,
    CustomCurrencyPipe,
    PaymentStatusPipe,
    NgClass,
    MatAutocompleteModule,
    FormsModule,
    AsyncPipe,
    MatIconModule,
    HasClaimDirective,
    MatCardModule,
    MatButtonModule
  ]
})
export class SalesOrderReportComponent extends BaseComponent implements OnInit {
  dataSource!: SalesOrderDataSource;
  salesOrders: SalesOrder[] = [];
  displayedColumns: string[] = [
    'action',
    'soCreatedDate',
    'orderNumber',
    'deliveryDate',
    'customerName',
    'totalDiscount',
    'totalTax',
    'totalAmount',
    'totalPaidAmount',
    'paymentStatus',
    'status',
  ];
  filterColumns: string[] = [
    'action-search',
    'soCreatedDate-search',
    'orderNumber-search',
    'deliverDate-search',
    'customer-search',
    'totalAmount-search',
    'totalDiscount-search',
    'totalTax-search',
    'totalPaidAmount-search',
    'paymentStatus-search',
    'status-search',
  ];
  footerToDisplayed: string[] = ['footer'];
  salesOrderResource: SalesOrderResourceParameter;
  loading$!: Observable<boolean>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  _customerFilter!: string;
  _orderNumberFilter!: string;
  customerNameControl: UntypedFormControl = new UntypedFormControl();
  customerList$!: Observable<Customer[]>;
  expandedElement!: SalesOrder | null;
  public filterObservable$: Subject<string> = new Subject<string>();
  salesOrderForInvoice!: SalesOrder;
  searchForm!: UntypedFormGroup;
  products: Product[] = [];
  locations: BusinessLocation[] = [];
  productResource: ProductResourceParameter;
  currentDate: Date = this.CurrentDate;

  public get CustomerFilter(): string {
    return this._customerFilter;
  }

  public set CustomerFilter(v: string) {
    this._customerFilter = v;
    const customerFilter = `customerName:${v}`;
    this.filterObservable$.next(customerFilter);
  }

  public get OrderNumberFilter(): string {
    return this._orderNumberFilter;
  }

  public set OrderNumberFilter(v: string) {
    this._orderNumberFilter = v;
    const orderNumberFilter = `orderNumber:${v}`;
    this.filterObservable$.next(orderNumberFilter);
  }

  constructor(
    private salesOrderService: SalesOrderService,
    private customerService: CustomerService,
    private cd: ChangeDetectorRef,
    private fb: UntypedFormBuilder,
    private productService: ProductService,
    private utcToLocalTime: UTCToLocalTime,
    private customCurrencyPipe: CustomCurrencyPipe,
    private paymentStatusPipe: PaymentStatusPipe,
    private commonService: CommonService,
    private dialog: MatDialog,
    private toastr: ToastrService
  ) {
    super();
    this.getLangDir();
    this.productResource = new ProductResourceParameter();
    this.salesOrderResource = new SalesOrderResourceParameter();
    this.salesOrderResource.pageSize = 50;
    this.salesOrderResource.orderBy = 'soCreatedDate asc';
  }

  ngOnInit(): void {
    this.customerNameControlOnChange();
    this.createSearchFormGroup();
    this.getProductByNameValue();
    this.getProducts();
    this.dataSource = new SalesOrderDataSource(this.salesOrderService);
    this.getResourceParameter();
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
        this.dataSource.loadData(this.salesOrderResource);
      });
    this.getBusinessLocations();

    this.dataSource.connect().subscribe((d) => {
      this.salesOrders = d;
    });
  }

  getBusinessLocations() {
    this.commonService.getLocationsForReport().subscribe((locationResponse) => {
      this.locations = locationResponse.locations;
      if (this.locations?.length > 0) {
        this.salesOrderResource.locationId = locationResponse.selectedLocation;
        this.dataSource.loadData(this.salesOrderResource);
        this.searchForm
          .get('locationId')
          ?.setValue(this.salesOrderResource.locationId);
      }
    });
    this.salesOrderResource.fromDate = this.FromDate;
    this.salesOrderResource.toDate = this.ToDate;
  }

  createSearchFormGroup() {
    this.searchForm = this.fb.group(
      {
        fromDate: [this.FromDate],
        toDate: [this.ToDate],
        filterProductValue: [''],
        productId: [''],
        locationId: [''],
      },
      {
        validators: dateCompare(),
      }
    );
  }

  onSearch() {
    if (this.searchForm.valid) {
      this.salesOrderResource.fromDate = this.searchForm.get('fromDate')?.value;
      this.salesOrderResource.toDate = this.searchForm.get('toDate')?.value;
      this.salesOrderResource.productId =
        this.searchForm.get('productId')?.value;
      this.salesOrderResource.locationId =
        this.searchForm.get('locationId')?.value;
      this.dataSource.loadData(this.salesOrderResource);
    }
  }

  onClear() {
    this.searchForm.reset();
    this.searchForm.get('locationId')?.setValue(this.locations[0]?.id);
    this.salesOrderResource.fromDate = this.searchForm.get('fromDate')?.value;
    this.salesOrderResource.toDate = this.searchForm.get('toDate')?.value;
    this.salesOrderResource.productId = this.searchForm.get('productId')?.value;
    this.salesOrderResource.locationId = this.searchForm.get('locationId')?.value;
    this.dataSource.loadData(this.salesOrderResource);
  }

  getProductByNameValue() {
    this.sub$.sink = this.searchForm
      .get('filterProductValue')
      ?.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((c) => {
          this.productResource.name = c;
          return this.productService.getProductsDropdown(this.productResource);
        })
      )
      .subscribe(
        (resp: Product[]) => {
          if (resp) {
            this.products = [...resp];
          }
        });
  }

  getProducts() {
    this.productResource.name = '';
    return this.productService.getProductsDropdown(this.productResource).subscribe(
      (resp: Product[]) => {
        if (resp && resp.length > 0) {
          this.products = [...resp];
        }
      });
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
        tap(() => {
          this.salesOrderResource.skip =
            this.paginator.pageIndex * this.paginator.pageSize;
          this.salesOrderResource.pageSize = this.paginator.pageSize;
          this.salesOrderResource.orderBy =
            this.sort.active + ' ' + this.sort.direction;
          this.dataSource.loadData(this.salesOrderResource);
        })
      )
      .subscribe();
  }

  getResourceParameter() {
    this.sub$.sink = this.dataSource.responseHeaderSubject$.subscribe(
      (c: ResponseHeader) => {
        if (c) {
          this.salesOrderResource.pageSize = c.pageSize;
          this.salesOrderResource.skip = c.skip;
          this.salesOrderResource.totalCount = c.totalCount;
        }
      }
    );
  }

  toggleRow(element: SalesOrder) {
    this.expandedElement = this.expandedElement === element ? null : element;
    this.cd.detectChanges();
  }

  onDownloadReport(type: string) {
    if (!this.salesOrderResource || this.salesOrderResource.totalCount === 0) {
      this.toastr.error(this.translationService.getValue('NO_DATA_FOUND'));
      return;
    }
    this.salesOrderService
      .getAllSalesOrderExcel(this.salesOrderResource)
      .subscribe((c: HttpResponse<SalesOrder[]>) => {
        if (c.body) {
          this.salesOrders = [...c.body];
          let heading = [
            [
              this.translationService.getValue('CREATED_DATE'),
              this.translationService.getValue('ORDER_NUMBER'),
              this.translationService.getValue('DELIVERY_DATE'),
              this.translationService.getValue('CUSTOMER_NAME'),
              this.translationService.getValue('TOTAL_DISCOUNT'),
              this.translationService.getValue('TOTAL_TAX'),
              this.translationService.getValue('TOTAL_AMOUNT'),
              this.translationService.getValue('TOTAL_PAID_AMOUNT'),
              this.translationService.getValue('PAYMENT_STATUS'),
              this.translationService.getValue('IS_RETURN'),
            ],
          ];

          let salesOrderReport: any = [];
          this.salesOrders.forEach((salesOrder: SalesOrder) => {
            const salesOrderItems = [this.utcToLocalTime.transform(salesOrder.soCreatedDate, 'shortDate'),
            salesOrder.orderNumber,
            this.utcToLocalTime.transform(salesOrder.deliveryDate, 'shortDate'),
            salesOrder.customerName,
            this.customCurrencyPipe.transform(salesOrder.totalDiscount),
            this.customCurrencyPipe.transform(salesOrder.totalTax),
            this.customCurrencyPipe.transform(salesOrder.totalAmount),
            this.customCurrencyPipe.transform(salesOrder.totalPaidAmount),
            this.paymentStatusPipe.transform(salesOrder.paymentStatus),
            salesOrder.status == 1 ? 'Yes' : 'No'
            ]
            salesOrderReport.push(salesOrderItems);
          });
          const title = this.translationService.getValue('SALES_ORDER_REPORT');
          if (type === 'csv' || type === 'xlsx') {
            let workBook = XLSX.utils.book_new();
            XLSX.utils.sheet_add_aoa(workBook, heading);
            let workSheet = XLSX.utils.sheet_add_json(workBook, salesOrderReport, {
              origin: 'A2',
              skipHeader: true,
            });
            XLSX.utils.book_append_sheet(workBook, workSheet, title);
            XLSX.writeFile(workBook, `${title}.${type}`);
          } else {
            const doc = new jsPDF();
            doc.setFontSize(16);
            const pageWidth = doc.internal.pageSize.getWidth();
            const titleWidth = doc.getTextWidth(title);
            const titleX = (pageWidth - titleWidth) / 2;
            doc.text(title, titleX, 10);
            doc.setFontSize(10);
            const locationName = this.locations.find(x => x.id == this.salesOrderResource.locationId)?.name;
            let y = 15;
            doc.text(`${this.translationService.getValue('BUSINESS_LOCATION')}::${locationName}`, 14, y);
            let dateFilter = '';
            if (this.salesOrderResource.fromDate) {
              dateFilter = `${this.translationService.getValue('FROM')}::${this.utcToLocalTime.transform(this.salesOrderResource.fromDate, 'shortDate')}`;
            }
            if (this.salesOrderResource.toDate) {
              dateFilter = dateFilter + `   ${this.translationService.getValue('TO')}::${this.utcToLocalTime.transform(this.salesOrderResource.toDate, 'shortDate')}`;
            }
            if (dateFilter) {
              y = y + 5;
              doc.text(dateFilter, 14, y);
            }
            if (this.salesOrderResource.productId) {
              const productName = this.products.find(x => x.id == this.salesOrderResource.productId)?.name;
              y = y + 5;
              doc.text(`${this.translationService.getValue('PRODUCT')}::${productName}`, 14, y);
            }
            y = y + 5;
            autoTable(doc, {
              head: heading,
              body: salesOrderReport,
              startY: y
            });
            if (type === 'pdf') {
              doc.save(`${title}.pdf`);
            } else {
              const base64String = doc.output('datauristring').split(',')[1];
              const dialogRef = this.dialog.open(SendEmailComponent, {
                data: Object.assign({}, { blob: base64String, name: `${title}.pdf`, contentType: 'application/pdf', subject: `${title} ${dateFilter}` }),
                minWidth: '40vw',
              });
              dialogRef.afterClosed().subscribe(() => {
              });
            }
          }
        }
      });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.salesOrders.indexOf(row);
  }
}
