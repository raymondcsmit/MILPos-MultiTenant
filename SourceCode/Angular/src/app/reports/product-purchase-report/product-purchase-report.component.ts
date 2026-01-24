import { HttpResponse } from '@angular/common/http';
import { Component, ViewChild } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { Product } from '@core/domain-classes/product';
import { ProductResourceParameter } from '@core/domain-classes/product-resource-parameter';
import { PurchaseOrderItem } from '@core/domain-classes/purchase-order-item';
import { PurchaseOrderResourceParameter } from '@core/domain-classes/purchase-order-resource-parameter';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { Supplier } from '@core/domain-classes/supplier';
import { dateCompare } from '@core/services/date-range';
import { merge, Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { ProductPurchaseReportDataSource } from './product-purchase-report.datasource';
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
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { BaseComponent } from '../../base.component';
import { PurchaseOrderService } from '../../purchase-order/purchase-order.service';
import { SupplierService } from '../../supplier/supplier.service';
import { ProductService } from '../../product/product.service';
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from '@core/services/toastr.service';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-product-purchase-report',
  templateUrl: './product-purchase-report.component.html',
  styleUrls: ['./product-purchase-report.component.scss'],
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
export class ProductPurchaseReportComponent extends BaseComponent {
  dataSource!: ProductPurchaseReportDataSource;
  purchaseOrderItems: PurchaseOrderItem[] = [];
  displayedColumns: string[] = ['productName', 'purchaseOrderNumber', 'supplierName', 'poCreatedDate', 'unitName', 'unitPrice', 'quantity', 'totalDiscount', 'taxes', 'totalTax', 'totalAmount'];
  footerToDisplayed: string[] = ['footer'];
  purchaseOrderResource: PurchaseOrderResourceParameter;
  loading$!: Observable<boolean>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  _supplierFilter!: string;
  _orderNumberFilter!: string;
  supplierNameControl: UntypedFormControl = new UntypedFormControl();
  supplierList$!: Observable<Supplier[]>;
  searchForm!: UntypedFormGroup;
  currentDate: Date = this.CurrentDate;
  products: Product[] = [];
  locations: BusinessLocation[] = [];
  productResource: ProductResourceParameter;


  public filterObservable$: Subject<string> = new Subject<string>();

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
    private commonService: CommonService,
    private fb: UntypedFormBuilder,
    private productService: ProductService,
    private utcToLocalTime: UTCToLocalTime,
    private customCurrencyPipe: CustomCurrencyPipe,
    private dialog: MatDialog,
    private toastr: ToastrService) {
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
    this.getProducts();
    this.getProductByNameValue();
    this.dataSource = new ProductPurchaseReportDataSource(this.purchaseOrderService);
    this.getResourceParameter();
    this.sub$.sink = this.filterObservable$
      .pipe(
        debounceTime(1000),
        distinctUntilChanged())
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
      this.purchaseOrderItems = d;
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
    this.searchForm = this.fb.group({
      fromDate: [this.FromDate],
      toDate: [this.ToDate],
      filterProductValue: [''],
      productId: [''],
      locationId: ['']
    }, {
      validators: dateCompare()
    });
    this.purchaseOrderResource.fromDate = this.FromDate;
    this.purchaseOrderResource.toDate = this.ToDate;
  }

  onSearch() {
    if (this.searchForm.valid) {
      this.purchaseOrderResource.fromDate = this.searchForm.get('fromDate')?.value;
      this.purchaseOrderResource.toDate = this.searchForm.get('toDate')?.value;
      this.purchaseOrderResource.productId = this.searchForm.get('productId')?.value;
      this.purchaseOrderResource.locationId = this.searchForm.get('locationId')?.value;
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
    this.sub$.sink = this.searchForm.get('filterProductValue')?.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap(c => {
          this.productResource.name = c;
          return this.productService.getProductsDropdown(this.productResource);
        })
      ).subscribe({
        next: (resp: Product[]) => {
          if (resp && resp.length > 0) {
            this.products = [...resp];
          }
        },
        error: (err) => {

        }
      }
      );
  }

  getProducts() {
    this.productResource.name = '';
    return this.productService.getProductsDropdown(this.productResource)
      .subscribe({
        next: (resp: Product[]) => {
          if (resp && resp.length > 0) {
            this.products = [...resp];
          }
        },
        error: (err) => {

        }
      });
  }


  supplierNameControlOnChange() {
    this.supplierList$ = this.supplierNameControl.valueChanges.pipe(
      debounceTime(1000),
      distinctUntilChanged(),
      switchMap(c => {
        return this.supplierService.getSuppliersForDropDown(c);
      })
    );
  }

  ngAfterViewInit() {
    this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);

    this.sub$.sink = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        tap((c: any) => {
          this.purchaseOrderResource.skip = this.paginator.pageIndex * this.paginator.pageSize;
          this.purchaseOrderResource.pageSize = this.paginator.pageSize;
          this.purchaseOrderResource.orderBy = this.sort.active + ' ' + this.sort.direction;
          this.dataSource.loadData(this.purchaseOrderResource);
        })
      )
      .subscribe();
  }

  getResourceParameter() {
    this.sub$.sink = this.dataSource.responseHeaderSubject$
      .subscribe((c: ResponseHeader) => {
        if (c) {
          this.purchaseOrderResource.pageSize = c.pageSize;
          this.purchaseOrderResource.skip = c.skip;
          this.purchaseOrderResource.totalCount = c.totalCount;
        }
      });
  }

  onDownloadReport(type: string) {
    if (!this.purchaseOrderResource || this.purchaseOrderResource.totalCount === 0) {
      this.toastr.error(this.translationService.getValue('NO_DATA_FOUND'));
      return;
    }

    this.purchaseOrderService.getAllPurchaseOrderItemReport(this.purchaseOrderResource)
      .subscribe((c: HttpResponse<PurchaseOrderItem[]>) => {
        if (c.body) {
          this.purchaseOrderItems = [...c.body];
          let heading = [[
            this.translationService.getValue('PRODUCT_NAME'),
            this.translationService.getValue('ORDER_NUMBER'),
            this.translationService.getValue('PURCHASE_DATE'),
            this.translationService.getValue('UNIT'),
            this.translationService.getValue('UNIT_PER_PRICE'),
            this.translationService.getValue('QUANTITY'),
            this.translationService.getValue('TOTAL_DISCOUNT'),
            this.translationService.getValue('TAX'),
            this.translationService.getValue('TOTAL_TAX'),
            this.translationService.getValue('TOTAL')
          ]];

          let purchaseOrderReport: any = [];
          this.purchaseOrderItems.forEach((purchaseOrderItem: PurchaseOrderItem) => {
            purchaseOrderReport.push([
              purchaseOrderItem.productName,
              purchaseOrderItem.purchaseOrderNumber,
              this.utcToLocalTime.transform(purchaseOrderItem.poCreatedDate ?? new Date(), 'shortDate'),
              purchaseOrderItem.unitName,
              this.customCurrencyPipe.transform(purchaseOrderItem.unitPrice),
              purchaseOrderItem.quantity,
              this.customCurrencyPipe.transform(purchaseOrderItem.discount),
              purchaseOrderItem.purchaseOrderItemTaxes.map(c => c.taxName + '(' + c.taxPercentage + ' %)',),
              this.customCurrencyPipe.transform(purchaseOrderItem.taxValue),
              this.customCurrencyPipe.transform((purchaseOrderItem.unitPrice * purchaseOrderItem.quantity) - purchaseOrderItem.discount + purchaseOrderItem.taxValue)
            ]);
          });

          const title = this.translationService.getValue('PRODUCT_PURCHASE_REPORT');
          if (type === 'csv' || type == 'xlsx') {
            let workBook = XLSX.utils.book_new();
            XLSX.utils.sheet_add_aoa(workBook, heading);
            let workSheet = XLSX.utils.sheet_add_json(workBook, purchaseOrderReport, { origin: "A2", skipHeader: true });
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
    return this.purchaseOrderItems.indexOf(row);
  }
}
