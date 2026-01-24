import { HttpResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, UntypedFormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { TaxItem } from '@core/domain-classes/purchase-sales-order-tax-item';
import { OrderTotals } from '@core/domain-classes/purchase-sales-order-total';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { CommonService } from '@core/services/common.service';
import { dateCompare } from '@core/services/date-range';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { Observable, Subject, debounceTime, distinctUntilChanged, switchMap, merge, tap } from 'rxjs';
import * as XLSX from 'xlsx';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { SalesOrder } from '@core/domain-classes/sales-order';
import { SalesOrderResourceParameter } from '@core/domain-classes/sales-order-resource-parameter';
import { Customer } from '@core/domain-classes/customer';
import { OutTaxReportItemComponent } from './out-tax-report-item/out-tax-report-item.component';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SendEmailComponent } from '@shared/send-email/send-email.component';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { BaseComponent } from '../../../base.component';
import { SalesOrderDataSource } from '../../../sales-order/sales-order-datasource';
import { SalesOrderService } from '../../../sales-order/sales-order.service';
import { CustomerService } from '../../../customer/customer.service';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { AsyncPipe, NgClass } from '@angular/common';
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from '@core/services/toastr.service';

@Component({
  selector: 'app-out-tax-report',
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatDatepickerModule,
    MatMenuModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    CustomCurrencyPipe,
    HasClaimDirective,
    UTCToLocalTime,
    OutTaxReportItemComponent,
    MatIconModule,
    FormsModule,
    MatAutocompleteModule,
    AsyncPipe,
    MatCardModule,
    MatButtonModule,
    NgClass
  ],
  templateUrl: './out-tax-report.component.html',
  styleUrl: './out-tax-report.component.scss',
  providers: [UTCToLocalTime, CustomCurrencyPipe]
})
export class OutTaxReportComponent extends BaseComponent {
  dataSource!: SalesOrderDataSource;
  locations: BusinessLocation[] = [];
  displayedColumns: string[] = [
    'action',
    'soCreatedDate',
    'orderNumber',
    'customerName',
    'customerTaxNumber',
    'businessLocation',
    'totalTax',

  ];
  filterColumns: string[] = [
    'action-search',
    'soCreatedDate-search',
    'orderNumber-search',
    'customer-search',
    'customerTaxNumber-search',
    'businessLocation-search',
    'totalTax-search',
  ];
  footerToDisplayed: string[] = ['footer', 'totalLabel', 'grandTotalTaxAmount'];
  salesOrderResource: SalesOrderResourceParameter;
  salesOrderItems: SalesOrder[] = [];
  loading$!: Observable<boolean>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  _customerFilter!: string;
  _orderNumberFilter!: string;
  customerNameControl: UntypedFormControl = new UntypedFormControl();
  customerList$!: Observable<Customer[]>;
  expandedElement!: SalesOrder | null;
  public filterObservable$: Subject<string> = new Subject<string>();
  searchForm!: UntypedFormGroup;
  currentDate: Date = this.CurrentDate;
  salesOrderTotal: OrderTotals = {
    grandTotalAmount: 0,
    grandTotalTaxAmount: 0,
    grandTotalQuantity: 0,
    grandTotalDiscountAmount: 0,
    grandTotalPaidAmount: 0
  };
  totalsByTax: TaxItem[] = [];
  public get CustomerFilter(): string {
    return this._customerFilter;
  }

  public set CustomerFilter(v: string) {
    this._customerFilter = v;
    this.filterObservable$.next(`customerName:${v}`);
  }

  public get OrderNumberFilter(): string {
    return this._orderNumberFilter;
  }

  public set OrderNumberFilter(v: string) {
    this._orderNumberFilter = v;
    this.filterObservable$.next(`orderNumber:${v}`);
  }

  constructor(
    private salesOrderService: SalesOrderService,
    private customerService: CustomerService,
    private cd: ChangeDetectorRef,
    private fb: UntypedFormBuilder,
    private utcToLocalTime: UTCToLocalTime,
    private customCurrencyPipe: CustomCurrencyPipe,
    private commonService: CommonService,
    private dialog: MatDialog,
    private toastr: ToastrService
  ) {
    super();
    this.getLangDir();
    this.salesOrderResource = new SalesOrderResourceParameter();
    this.salesOrderResource.pageSize = 50;
    this.salesOrderResource.orderBy = 'soCreatedDate desc';
    this.salesOrderResource.isSalesOrderRequest = false;
  }

  ngOnInit(): void {
    this.customerNameControlOnChange();
    this.createSearchFormGroup();
    this.dataSource = new SalesOrderDataSource(
      this.salesOrderService
    );
    this.getResourceParameter();
    this.getBusinessLocations();
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
        this.getTaxTotals();
      });

    this.dataSource.connect().subscribe((data: SalesOrder[]) => {
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
        this.getTaxTotals();
      }
    });
  }



  createSearchFormGroup() {
    this.searchForm = this.fb.group(
      {
        fromDate: [this.FromDate],
        toDate: [this.ToDate],
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
      this.salesOrderResource.fromDate =
        this.searchForm.get('fromDate')?.value;
      this.salesOrderResource.toDate = this.searchForm.get('toDate')?.value;
      this.salesOrderResource.locationId =
        this.searchForm.get('locationId')?.value;
      this.dataSource.loadData(this.salesOrderResource);
      this.getTaxTotals();
    }
  }

  onClear() {
    this.searchForm.reset();
    this.searchForm.get('locationId')?.setValue(this.locations[0]?.id);
    this.salesOrderResource.fromDate = this.searchForm.get('fromDate')?.value;
    this.salesOrderResource.toDate = this.searchForm.get('toDate')?.value;
    this.salesOrderResource.locationId =
      this.searchForm.get('locationId')?.value;
    this.dataSource.loadData(this.salesOrderResource);
    this.getTaxTotals();
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
          const salesOrders = [...c.body];
          let heading = [
            [
              this.translationService.getValue('CREATED_DATE'),
              this.translationService.getValue('ORDER_NUMBER'),
              this.translationService.getValue('CUSTOMER_NAME'),
              this.translationService.getValue('TAX_NUMBER'),
              this.translationService.getValue('TOTAL_AMOUNT'),
              this.translationService.getValue('TOTAL_TAX'),
            ],
          ];

          let salesOrderReport = [];
          salesOrders.forEach((salesOrder: SalesOrder) => {
            salesOrderReport.push([
              this.utcToLocalTime.transform(salesOrder.soCreatedDate, 'shortDate'),
              salesOrder.orderNumber,
              salesOrder.customerName,
              salesOrder.customerTaxNumber,
              this.customCurrencyPipe.transform(salesOrder.totalAmount),
              this.customCurrencyPipe.transform(salesOrder.totalTax)
            ]);
          });

          salesOrderReport.push(['', '', '',
            this.translationService.getValue('TOTAL'),
            this.customCurrencyPipe.transform(this.salesOrderTotal?.grandTotalAmount),
            this.customCurrencyPipe.transform(this.salesOrderTotal?.grandTotalTaxAmount)
          ]);

          const title = this.translationService.getValue('OUTPUT_TAX_REPORT');
          if (type == 'csv' || type == 'xlsx') {
            let workBook = XLSX.utils.book_new();
            XLSX.utils.sheet_add_aoa(workBook, heading);
            let workSheet = XLSX.utils.sheet_add_json(
              workBook,
              salesOrderReport,
              { origin: 'A2', skipHeader: true }
            );
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
            y = y + 5;
            autoTable(doc, {
              head: heading,
              body: salesOrderReport,
              startY: y
            });
            if (type === 'pdf') {
              doc.save(`${title}.pdf`);
            }
            else {
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

  onTaxDownloadReport(type: string) {
    let heading = [
      [
        this.translationService.getValue('TAXES'),
        this.translationService.getValue('TOTAL_TAX'),
      ],
    ];

    let taxReport = [];
    this.totalsByTax.forEach((tax) => {
      taxReport.push([
        tax.name,
        this.customCurrencyPipe.transform(tax.totalAmount),
      ]);
    });

    taxReport.push([
      this.translationService.getValue('TOTAL'),
      this.customCurrencyPipe.transform(this.salesOrderTotal?.grandTotalTaxAmount)
    ]);

    const title = this.translationService.getValue('OUTPUT_TAX_REPORT');
    if (type == 'csv' || type == 'xlsx') {
      let workBook = XLSX.utils.book_new();
      XLSX.utils.sheet_add_aoa(workBook, heading);
      let workSheet = XLSX.utils.sheet_add_json(
        workBook,
        taxReport,
        { origin: 'A2', skipHeader: true }
      );
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
      y = y + 5;
      autoTable(doc, {
        head: heading,
        body: taxReport,
        startY: y
      });
      if (type === 'pdf') {
        doc.save(`${title}.pdf`);
      }
      else {
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

  getTaxTotals() {
    this.getSalesOrderTotals();
    this.getTotalByTax();
  }

  getSalesOrderTotals() {
    this.salesOrderService
      .getSalesOrderTotal(this.salesOrderResource).subscribe(data => {
        if (data !== null && data !== undefined) {
          this.salesOrderTotal = data;
        } else {
          this.salesOrderTotal = {
            grandTotalAmount: 0,
            grandTotalTaxAmount: 0,
            grandTotalQuantity: 0,
            grandTotalDiscountAmount: 0,
            grandTotalPaidAmount: 0
          };
        }
      });
  }

  getTotalByTax() {
    this.salesOrderService
      .getTotalByTaxForSalesOrder(this.salesOrderResource).subscribe(data => {
        this.totalsByTax = data;
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

