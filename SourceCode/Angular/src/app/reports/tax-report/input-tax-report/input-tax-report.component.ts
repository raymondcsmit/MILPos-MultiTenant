import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { UntypedFormControl, UntypedFormGroup, UntypedFormBuilder, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { PurchaseOrderResourceParameter } from '@core/domain-classes/purchase-order-resource-parameter';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { Supplier } from '@core/domain-classes/supplier';
import { CommonService } from '@core/services/common.service';
import { dateCompare } from '@core/services/date-range';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { Observable, Subject, debounceTime, distinctUntilChanged, switchMap, merge, tap } from 'rxjs';
import * as XLSX from 'xlsx';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTableModule } from '@angular/material/table';
import { PaymentStatusPipe } from '@shared/pipes/payment-status.pipe';
import { MatDialog } from '@angular/material/dialog';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';
import { MatMenuModule } from '@angular/material/menu';
import { PurchaseOrderReportDataSource } from '../../purchase-order-report/purchase-order-report.datasource';
import { OrderTotals } from '@core/domain-classes/purchase-sales-order-total';
import { TaxItem } from '@core/domain-classes/purchase-sales-order-tax-item';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SendEmailComponent } from '@shared/send-email/send-email.component';
import { TranslateModule } from '@ngx-translate/core';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { InputTaxReportItemComponent } from './input-tax-report-item/input-tax-report-item.component';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BaseComponent } from '../../../base.component';
import { PurchaseOrderService } from '../../../purchase-order/purchase-order.service';
import { SupplierService } from '../../../supplier/supplier.service';
import { AsyncPipe, NgClass } from '@angular/common';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCardModule } from "@angular/material/card";
import { ToastrService } from '@core/services/toastr.service';

@Component({
  selector: 'app-input-tax-report',
  imports: [
    TranslateModule,
    PageHelpTextComponent,
    ReactiveFormsModule,
    MatSelectModule,
    MatDatepickerModule,
    MatMenuModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    CustomCurrencyPipe,
    InputTaxReportItemComponent,
    HasClaimDirective,
    MatIconModule,
    MatButtonModule,
    AsyncPipe,
    FormsModule,
    MatAutocompleteModule,
    UTCToLocalTime,
    MatCardModule,
    NgClass
  ],
  templateUrl: './input-tax-report.component.html',
  styleUrl: './input-tax-report.component.scss',
  providers: [UTCToLocalTime, CustomCurrencyPipe, PaymentStatusPipe]
})
export class InputTaxReportComponent extends BaseComponent {
  dataSource!: PurchaseOrderReportDataSource;
  purchaseOrders: PurchaseOrder[] = [];
  locations: BusinessLocation[] = [];
  displayedColumns: string[] = [
    'action',
    'poCreatedDate',
    'orderNumber',
    'supplierName',
    'supplierTaxNumber',
    'businessLocation',
    'totalTax',
  ];
  filterColumns: string[] = [
    'action-search',
    'poCreatedDate-search',
    'orderNumber-search',
    'supplier-search',
    'supplierTaxNumber-search',
    'businessLocation-search',
    'totalTax-search',
  ];
  footerToDisplayed: string[] = ['footer', 'totalLabel', 'grandTotalTaxAmount'];
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
  purchaseOrderForInvoice!: PurchaseOrder;
  currentDate: Date = this.CurrentDate;
  purchaseOrderTotal: OrderTotals = {
    grandTotalAmount: 0,
    grandTotalTaxAmount: 0,
    grandTotalQuantity: 0,
    grandTotalDiscountAmount: 0,
    grandTotalPaidAmount: 0
  };
  totalsByTax: TaxItem[] = [];
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
    private utcToLocalTime: UTCToLocalTime,
    private customCurrencyPipe: CustomCurrencyPipe,
    private commonService: CommonService,
    private dialog: MatDialog,
    private toastr: ToastrService
  ) {
    super();
    this.getLangDir();
    this.purchaseOrderResource = new PurchaseOrderResourceParameter();
    this.purchaseOrderResource.pageSize = 50;
    this.purchaseOrderResource.orderBy = 'poCreatedDate desc';
    this.purchaseOrderResource.isPurchaseOrderRequest = false;
  }

  ngOnInit(): void {
    this.supplierNameControlOnChange();
    this.createSearchFormGroup();
    this.dataSource = new PurchaseOrderReportDataSource(
      this.purchaseOrderService
    );
    this.getResourceParameter();
    this.getBusinessLocations();
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
        this.getTaxTotals();
      });

      this.dataSource.connect().subscribe((data: PurchaseOrder[]) => {
        this.purchaseOrders = data;
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
    this.purchaseOrderResource.fromDate = this.FromDate;
    this.purchaseOrderResource.toDate = this.ToDate;
  }

  onSearch() {
    if (this.searchForm.valid) {
      this.purchaseOrderResource.fromDate =
        this.searchForm.get('fromDate')?.value;
      this.purchaseOrderResource.toDate = this.searchForm.get('toDate')?.value;
      this.purchaseOrderResource.locationId =
        this.searchForm.get('locationId')?.value;
      this.dataSource.loadData(this.purchaseOrderResource);
      this.getTaxTotals();
    }
  }

  onClear() {
    this.searchForm.reset();
    this.searchForm.get('locationId')?.setValue(this.locations[0]?.id);
    this.purchaseOrderResource.fromDate = this.searchForm.get('fromDate')?.value;
    this.purchaseOrderResource.toDate = this.searchForm.get('toDate')?.value;
    this.purchaseOrderResource.locationId =
      this.searchForm.get('locationId')?.value;
    this.dataSource.loadData(this.purchaseOrderResource);
    this.getTaxTotals();
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
        if (c.body) {
          this.purchaseOrderResource.pageSize = 50;
          this.purchaseOrders = [...c.body];
          let heading = [
            [
              this.translationService.getValue('CREATED_DATE'),
              this.translationService.getValue('ORDER_NUMBER'),
              this.translationService.getValue('SUPPLIER_NAME'),
              this.translationService.getValue('TAX_NUMBER'),
              this.translationService.getValue('TOTAL_AMOUNT'),
              this.translationService.getValue('TOTAL_TAX'),
            ],
          ];

          let purchaseOrderReport = [];
          this.purchaseOrders.forEach((purchaseOrder: PurchaseOrder) => {
            purchaseOrderReport.push([
              this.utcToLocalTime.transform(purchaseOrder.poCreatedDate, 'shortDate'),
              purchaseOrder.orderNumber,
              purchaseOrder.supplierName,
              purchaseOrder.supplierTaxNumber,
              this.customCurrencyPipe.transform(purchaseOrder.totalAmount),
              this.customCurrencyPipe.transform(purchaseOrder.totalTax)
            ]);
          });

          purchaseOrderReport.push([
            '',
            '',
            '',
            this.translationService.getValue('TOTAL'),
            this.customCurrencyPipe.transform(this.purchaseOrderTotal?.grandTotalAmount ?? 0),
            this.customCurrencyPipe.transform(this.purchaseOrderTotal?.grandTotalTaxAmount ?? 0)
          ]);

          const title = this.translationService.getValue('INPUT_TAX_REPORT');

          if (type === 'csv' || type === 'xlsx') {
            let workBook = XLSX.utils.book_new();
            XLSX.utils.sheet_add_aoa(workBook, heading);
            let workSheet = XLSX.utils.sheet_add_json(
              workBook,
              purchaseOrderReport,
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
            y = y + 5;
            autoTable(doc, {
              head: heading,
              body: purchaseOrderReport,
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
      this.customCurrencyPipe.transform(this.purchaseOrderTotal?.grandTotalTaxAmount ?? 0)
    ]);

    const title = this.translationService.getValue('INPUT_TAX_REPORT');

    if (type === 'csv' || type === 'xlsx') {
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
    this.getPurchaseOrderTotals();
    this.getTotalByTax();
  }

  getPurchaseOrderTotals() {
    this.purchaseOrderService
      .getPurchaseOrderTotal(this.purchaseOrderResource).subscribe(data => {
        if (data !== null && data !== undefined) {
          this.purchaseOrderTotal = data;
        } else {
          this.purchaseOrderTotal = {
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
    this.purchaseOrderService
      .getTotalByTaxForPurchaseOrder(this.purchaseOrderResource).subscribe(data => {
        this.totalsByTax = data;
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
