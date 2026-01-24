import { HttpResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import {
  FormsModule,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormControl,
  UntypedFormGroup,
} from '@angular/forms';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { Product } from '@core/domain-classes/product';
import { ProductResourceParameter } from '@core/domain-classes/product-resource-parameter';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';
import { PurchaseOrderResourceParameter } from '@core/domain-classes/purchase-order-resource-parameter';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { Supplier } from '@core/domain-classes/supplier';
import { dateCompare } from '@core/services/date-range';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { merge, Observable, Subject } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  tap,
} from 'rxjs/operators';
import { PurchaseOrderReportDataSource } from './purchase-order-report.datasource';
import * as XLSX from 'xlsx';
import { PaymentStatusPipe } from '@shared/pipes/payment-status.pipe';
import { CommonService } from '@core/services/common.service';
import { BusinessLocation } from '@core/domain-classes/business-location';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MatDialog } from '@angular/material/dialog';
import { SendEmailComponent } from '@shared/send-email/send-email.component';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { PurchaseOrderInvoiceComponent } from '@shared/purchase-order-invoice/purchase-order-invoice.component';
import { PurchaseOrderItemComponent } from './purchase-order-item/purchase-order-item.component';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { AsyncPipe, NgClass } from '@angular/common';
import { BaseComponent } from '../../base.component';
import { PurchaseOrderService } from '../../purchase-order/purchase-order.service';
import { SupplierService } from '../../supplier/supplier.service';
import { ProductService } from '../../product/product.service';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { PaymentMethodPipe } from '@shared/pipes/payment-method.pipe';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from '@core/services/toastr.service';

@Component({
  selector: 'app-purchase-order-report',
  templateUrl: './purchase-order-report.component.html',
  styleUrls: ['./purchase-order-report.component.scss'],
  providers: [UTCToLocalTime, CustomCurrencyPipe, PaymentStatusPipe],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatDatepickerModule,
    MatDividerModule,
    MatMenuModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    PurchaseOrderInvoiceComponent,
    PurchaseOrderItemComponent,
    HasClaimDirective,
    NgClass,
    FormsModule,
    MatAutocompleteModule,
    AsyncPipe,
    CustomCurrencyPipe,
    PaymentStatusPipe,
    UTCToLocalTime,
    RouterModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    NgClass
  ]
})
export class PurchaseOrderReportComponent extends BaseComponent {
  dataSource!: PurchaseOrderReportDataSource;
  locations: BusinessLocation[] = [];
  displayedColumns: string[] = [
    'action',
    'poCreatedDate',
    'orderNumber',
    'deliveryDate',
    'supplierName',
    'totalDiscount',
    'totalTax',
    'totalAmount',
    'totalPaidAmount',
    'paymentStatus',
    'status',
  ];
  filterColumns: string[] = [
    'action-search',
    'poCreatedDate-search',
    'orderNumber-search',
    'deliverDate-search',
    'supplier-search',
    'totalAmount-search',
    'totalDiscount-search',
    'totalTax-search',
    'totalPaidAmount-search',
    'paymentStatus-search',
    'status-search',
  ];
  footerToDisplayed: string[] = ['footer'];
  purchaseOrderResource: PurchaseOrderResourceParameter;
  loading$!: Observable<boolean>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  _supplierFilter!: string;
  _orderNumberFilter!: string;
  supplierNameControl: UntypedFormControl = new UntypedFormControl();
  supplierList$!: Observable<Supplier[]>;
  expandedElement!: PurchaseOrder | null;
  public filterObservable$: Subject<string> = new Subject<string>();
  searchForm!: UntypedFormGroup;
  products: Product[] = [];
  purchaseOrders: PurchaseOrder[] = [];
  productResource: ProductResourceParameter;
  purchaseOrderForInvoice!: PurchaseOrder | null;
  currentDate: Date = this.CurrentDate;
  public get SupplierFilter(): string {
    return this._supplierFilter;
  }

  public set SupplierFilter(v: string) {
    this._supplierFilter = v;
    const supplierFilter = `supplierName:${v}`;
    this.filterObservable$.next(supplierFilter);
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
    private purchaseOrderService: PurchaseOrderService,
    private supplierService: SupplierService,
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
    this.purchaseOrderResource = new PurchaseOrderResourceParameter();
    this.purchaseOrderResource.pageSize = 50;
    this.purchaseOrderResource.orderBy = 'poCreatedDate asc';
    this.purchaseOrderResource.isPurchaseOrderRequest = false;
  }

  ngOnInit(): void {
    this.supplierNameControlOnChange();
    this.createSearchFormGroup();
    this.getProductByNameValue();
    this.getProducts();
    this.dataSource = new PurchaseOrderReportDataSource(
      this.purchaseOrderService
    );
    this.getResourceParameter();
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
        this.dataSource.loadData(this.purchaseOrderResource);
      });
    this.getBusinessLocations();

    this.dataSource.connect().subscribe((d) => {
      this.purchaseOrders = d;
    });
  }

  getBusinessLocations() {
    this.commonService.getLocationsForReport().subscribe((locationResponse) => {
      this.locations = locationResponse.locations;
      if (this.locations?.length > 0) {
        this.purchaseOrderResource.locationId = locationResponse.selectedLocation;
        this.dataSource.loadData(this.purchaseOrderResource);
        this.searchForm
          .get('locationId')
          ?.setValue(this.purchaseOrderResource.locationId);
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
    this.purchaseOrderResource.fromDate = this.FromDate;
    this.purchaseOrderResource.toDate = this.ToDate;
  }

  onSearch() {
    if (this.searchForm.valid) {
      this.purchaseOrderResource.fromDate =
        this.searchForm.get('fromDate')?.value;
      this.purchaseOrderResource.toDate = this.searchForm.get('toDate')?.value;
      this.purchaseOrderResource.productId =
        this.searchForm.get('productId')?.value;
      this.purchaseOrderResource.locationId =
        this.searchForm.get('locationId')?.value;
      this.dataSource.loadData(this.purchaseOrderResource);
    }
  }

  onClear() {
    this.searchForm.reset();
    this.searchForm.get('locationId')?.setValue(this.locations[0]?.id);
    this.purchaseOrderResource.fromDate = this.searchForm.get('fromDate')?.value;
    this.purchaseOrderResource.toDate = this.searchForm.get('toDate')?.value;
    this.purchaseOrderResource.productId = this.searchForm.get('productId')?.value;
    this.purchaseOrderResource.locationId = this.searchForm.get('locationId')?.value;
    this.dataSource.loadData(this.purchaseOrderResource);
  }

  getProductByNameValue() {
    this.sub$.sink = this.searchForm
      .get('filterProductValue')
      ?.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((c: string) => {
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

  supplierNameControlOnChange() {
    this.supplierList$ = this.supplierNameControl.valueChanges.pipe(
      debounceTime(1000),
      distinctUntilChanged(),
      switchMap((c) => {
        return this.supplierService.getSuppliersForDropDown(c);
      })
    );
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
          this.dataSource.loadData(this.purchaseOrderResource);
        })
      )
      .subscribe();
  }

  getResourceParameter() {
    this.sub$.sink = this.dataSource.responseHeaderSubject$.subscribe(
      (c: ResponseHeader) => {
        if (c) {
          this.purchaseOrderResource.pageSize = c.pageSize;
          this.purchaseOrderResource.skip = c.skip;
          this.purchaseOrderResource.totalCount = c.totalCount;
        }
      }
    );
  }

  toggleRow(element: PurchaseOrder) {
    this.expandedElement = this.expandedElement === element ? null : element;
    this.cd.detectChanges();
  }

  generateInvoice(po: PurchaseOrder) {
    this.purchaseOrderService
      .getPurchaseOrderById(po.id ?? '')
      .subscribe((purchaserOrder) => {
        this.purchaseOrderForInvoice = purchaserOrder;
      });
  }

  onDownloadReport(type: string) {
    if (!this.purchaseOrderResource || this.purchaseOrderResource.totalCount === 0) {
      this.toastr.error(this.translationService.getValue('NO_DATA_FOUND'));
      return;
    }
    this.purchaseOrderResource.pageSize = 0;
    this.purchaseOrderResource.skip = 0;
    this.purchaseOrderService
      .getAllPurchaseOrder(this.purchaseOrderResource)
      .subscribe((c: HttpResponse<PurchaseOrder[]>) => {
        this.purchaseOrderResource.pageSize = 50;
        if (c.body) {
          const purchaseOrders = [...c.body];
          let heading = [
            [
              this.translationService.getValue('CREATED_DATE'),
              this.translationService.getValue('ORDER_NUMBER'),
              this.translationService.getValue('DELIVERY_DATE'),
              this.translationService.getValue('SUPPLIER_NAME'),
              this.translationService.getValue('TOTAL_DISCOUNT'),
              this.translationService.getValue('TOTAL_TAX'),
              this.translationService.getValue('TOTAL_AMOUNT'),
              this.translationService.getValue('TOTAL_PAID_AMOUNT'),
              this.translationService.getValue('PAYMENT_STATUS'),
              this.translationService.getValue('IS_RETURN'),
            ],
          ];

          let purchaseOrderReport: any = [];
          purchaseOrders.forEach((purchaseOrder: PurchaseOrder) => {
            const reportItem = [
              this.utcToLocalTime.transform(purchaseOrder.poCreatedDate, 'shortDate'),
              purchaseOrder.orderNumber,
              this.utcToLocalTime.transform(purchaseOrder.deliveryDate, 'shortDate'),
              purchaseOrder.supplierName,
              this.customCurrencyPipe.transform(purchaseOrder.totalDiscount),
              this.customCurrencyPipe.transform(purchaseOrder.totalTax),
              this.customCurrencyPipe.transform(purchaseOrder.totalAmount),
              this.customCurrencyPipe.transform(purchaseOrder.totalPaidAmount),
              this.paymentStatusPipe.transform(purchaseOrder.paymentStatus),
              purchaseOrder.status == 1 ? 'Yes' : 'No'
            ];
            purchaseOrderReport.push(reportItem);
          });
          const title = this.translationService.getValue('PURCHASE_ORDER_REPORT');
          if (type == 'xlsx' || type == 'csv') {
            let workBook = XLSX.utils.book_new();
            XLSX.utils.sheet_add_aoa(workBook, heading);
            let workSheet = XLSX.utils.sheet_add_json(
              workBook,
              purchaseOrderReport,
              { origin: 'A2', skipHeader: true }
            );
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
            const locationName = this.locations.find(x => x.id == this.purchaseOrderResource.locationId)?.name;
            let y = 15;
            doc.text(`${this.translationService.getValue('BUSINESS_LOCATION')}::${locationName}`, 14, y);
            let dateFilter = '';
            if (this.purchaseOrderResource.fromDate) {
              dateFilter = `${this.translationService.getValue('FROM')}::${this.utcToLocalTime.transform(this.purchaseOrderResource.fromDate, 'shortDate')}`;
            }
            if (this.purchaseOrderResource.toDate) {
              dateFilter = dateFilter + `   ${this.translationService.getValue('TO')}::${this.utcToLocalTime.transform(this.purchaseOrderResource.toDate, 'shortDate')}`;
            }
            if (dateFilter) {
              y = y + 5;
              doc.text(dateFilter, 14, y);
            }
            if (this.purchaseOrderResource.productId) {
              const productName = this.products.find(x => x.id == this.purchaseOrderResource.productId)?.name;
              y = y + 5;
              doc.text(`${this.translationService.getValue('PRODUCT')}::${productName}`, 14, y);
            }
            y = y + 5;
            autoTable(doc, {
              head: heading,
              body: purchaseOrderReport,
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
    return this.purchaseOrders.indexOf(row);
  }
}
