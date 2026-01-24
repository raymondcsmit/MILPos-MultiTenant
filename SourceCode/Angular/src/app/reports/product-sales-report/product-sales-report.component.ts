import { HttpResponse } from '@angular/common/http';
import { Component, ViewChild } from '@angular/core';
import {
  UntypedFormControl,
  UntypedFormGroup,
  UntypedFormBuilder,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { Product } from '@core/domain-classes/product';
import { ProductResourceParameter } from '@core/domain-classes/product-resource-parameter';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { dateCompare } from '@core/services/date-range';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { Observable, Subject, merge } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  tap,
} from 'rxjs/operators';
import * as XLSX from 'xlsx';
import { SalesOrderItem } from '@core/domain-classes/sales-order-item';
import { ProductSalesReportDataSource } from './product-sales-report.datasource';
import { SalesOrderResourceParameter } from '@core/domain-classes/sales-order-resource-parameter';
import { PaymentStatusPipe } from '@shared/pipes/payment-status.pipe';
import { Customer } from '@core/domain-classes/customer';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { CommonService } from '@core/services/common.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SendEmailComponent } from '@shared/send-email/send-email.component';
import { MatDialog } from '@angular/material/dialog';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { BaseComponent } from '../../base.component';
import { SalesOrderService } from '../../sales-order/sales-order.service';
import { CustomerService } from '../../customer/customer.service';
import { ProductService } from '../../product/product.service';
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from '@core/services/toastr.service';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-product-sales-report',
  templateUrl: './product-sales-report.component.html',
  styleUrls: ['./product-sales-report.component.scss'],
  providers: [UTCToLocalTime, CustomCurrencyPipe, PaymentStatusPipe],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    ReactiveFormsModule,
    MatSelectModule,
    TranslateModule,
    MatDatepickerModule,
    MatDividerModule,
    MatMenuModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    RouterModule,
    CustomCurrencyPipe,
    HasClaimDirective,
    UTCToLocalTime,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    NgClass
  ]
})
export class ProductSalesReportComponent extends BaseComponent {
  dataSource!: ProductSalesReportDataSource;
  salesOrderItems: SalesOrderItem[] = [];
  displayedColumns: string[] = [
    'productName',
    'salesOrderNumber',
    'customerName',
    'soCreatedDate',
    'unitName',
    'unitPrice',
    'quantity',
    'totalDiscount',
    'taxes',
    'totalTax',
    'totalAmount',
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
  searchForm!: UntypedFormGroup;
  currentDate: Date = this.CurrentDate;
  products: Product[] = [];
  locations: BusinessLocation[] = [];
  productResource: ProductResourceParameter;

  public filterObservable$: Subject<string> = new Subject<string>();

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
    private fb: UntypedFormBuilder,
    private productService: ProductService,
    private utcToLocalTime: UTCToLocalTime,
    private customCurrencyPipe: CustomCurrencyPipe,
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
    this.salesOrderResource.isSalesOrderRequest = false;
  }

  ngOnInit(): void {
    this.customerNameControlOnChange();
    this.createSearchFormGroup();
    this.getProducts();
    this.getProductByNameValue();
    this.dataSource = new ProductSalesReportDataSource(this.salesOrderService);
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

    this.dataSource.connect().subscribe((data: SalesOrderItem[]) => {
      this.salesOrderItems = data;
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
    this.salesOrderResource.fromDate = this.FromDate;
    this.salesOrderResource.toDate = this.ToDate;
  }

  onSearch() {
    if (this.searchForm.valid) {
      this.salesOrderResource.fromDate = this.searchForm.get('fromDate')?.value;
      this.salesOrderResource.toDate = this.searchForm.get('toDate')?.value;
      this.salesOrderResource.productId =
        this.searchForm.get('productId')?.value;
      this.salesOrderResource.locationId = this.searchForm.get('locationId')?.value;
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
      .subscribe({
        next: (resp: Product[]) => {
          this.products = [...resp];
        },
        error: () => { }
      }
      );
  }

  getProducts() {
    this.productResource.name = '';
    return this.productService.getProductsDropdown(this.productResource).subscribe(
      (resp: Product[]) => {
        if (resp) {
          this.products = [...resp];
        }
      },
      () => { }
    );
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

  onDownloadReport(type: string) {
    if (!this.salesOrderResource || this.salesOrderResource.totalCount === 0) {
      this.toastr.error(this.translationService.getValue('NO_DATA_FOUND'));
      return;
    }
    this.salesOrderResource.pageSize = 0;
    this.salesOrderService
      .getSalesOrderItemReport(this.salesOrderResource)
      .subscribe((c: HttpResponse<SalesOrderItem[]>) => {
        if (c.body) {
          this.salesOrderResource.pageSize = 50;
          this.salesOrderItems = [...c.body];
          let heading = [
            [
              this.translationService.getValue('PRODUCT_NAME'),
              this.translationService.getValue('ORDER_NUMBER'),
              this.translationService.getValue('SALES_DATE'),
              this.translationService.getValue('UNIT'),
              this.translationService.getValue('UNIT_PER_PRICE'),
              this.translationService.getValue('QUANTITY'),
              this.translationService.getValue('TOTAL_DISCOUNT'),
              this.translationService.getValue('TAX'),
              this.translationService.getValue('TOTAL_TAX'),
              this.translationService.getValue('TOTAL'),
            ],
          ];

          let salesOrderReport: any = [];
          this.salesOrderItems.forEach((salesOrderItem: SalesOrderItem) => {
            salesOrderReport.push([
              salesOrderItem.productName,
              salesOrderItem.salesOrderNumber,
              this.utcToLocalTime.transform(salesOrderItem.soCreatedDate ?? new Date(), 'shortDate'),
              salesOrderItem.unitName,
              this.customCurrencyPipe.transform(salesOrderItem.unitPrice),
              salesOrderItem.quantity,
              this.customCurrencyPipe.transform(salesOrderItem.discount),
              salesOrderItem.salesOrderItemTaxes.map((c) => c.taxName + '(' + c.taxPercentage + ' %)'),
              this.customCurrencyPipe.transform(salesOrderItem.taxValue),
              this.customCurrencyPipe.transform(
                salesOrderItem.unitPrice * salesOrderItem.quantity -
                salesOrderItem.discount +
                salesOrderItem.taxValue
              ),
            ]);
          });
          const title = this.translationService.getValue('PRODUCT_SALES_REPORT');
          if (type === 'csv' || type == 'xlsx') {
            let workBook = XLSX.utils.book_new();
            XLSX.utils.sheet_add_aoa(workBook, heading);
            let workSheet = XLSX.utils.sheet_add_json(workBook, salesOrderReport, {
              origin: 'A2',
              skipHeader: true,
            });
            XLSX.utils.book_append_sheet(
              workBook,
              workSheet,
              title
            );
            XLSX.writeFile(
              workBook,
              `${title}.${type}`
            );
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
    return this.salesOrderItems.indexOf(row);
  }
}
