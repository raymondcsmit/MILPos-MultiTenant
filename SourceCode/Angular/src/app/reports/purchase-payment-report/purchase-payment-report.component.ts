import { HttpResponse } from '@angular/common/http';
import { Component, OnInit, ViewChild } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { PurchaseOrderPayment } from '@core/domain-classes/purchase-order-payment';
import { PurchaseOrderResourceParameter } from '@core/domain-classes/purchase-order-resource-parameter';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { dateCompare } from '@core/services/date-range';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { PaymentStatusPipe } from '@shared/pipes/payment-status.pipe';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { merge, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PurchasePaymentReportDataSource } from './purchase-payment-report.datasource';
import { PurchasePaymentReportService } from './purchase-payment-report.service';
import * as XLSX from 'xlsx';
import { PaymentMethodPipe } from '@shared/pipes/payment-method.pipe';
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
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { BaseComponent } from '../../base.component';
import { RouterModule } from '@angular/router';
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from '@core/services/toastr.service';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-purchase-payment-report',
  templateUrl: './purchase-payment-report.component.html',
  styleUrls: ['./purchase-payment-report.component.scss'],
  providers: [UTCToLocalTime, CustomCurrencyPipe, PaymentStatusPipe, PaymentMethodPipe],
  standalone: true,
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
    PaymentMethodPipe,
    UTCToLocalTime,
    HasClaimDirective,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    NgClass
  ]
})
export class PurchasePaymentReportComponent extends BaseComponent implements OnInit {
  dataSource!: PurchasePaymentReportDataSource;
  isData: boolean = false;
  isDeleted = false;
  purchaseOrderResource: PurchaseOrderResourceParameter;
  searchForm!: UntypedFormGroup;
  locations: BusinessLocation[] = [];
  purchaseOrderPayments: PurchaseOrderPayment[] = [];
  loading$!: Observable<boolean>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  currentDate: Date = this.CurrentDate;

  constructor(
    private purchasePaymentReportService: PurchasePaymentReportService,
    private fb: UntypedFormBuilder,
    private utcToLocalTime: UTCToLocalTime,
    private customCurrencyPipe: CustomCurrencyPipe,
    private commonService: CommonService,
    private paymentMethodPipe: PaymentMethodPipe,
    private dialog: MatDialog,
    private toastr: ToastrService
  ) {
    super();
    this.getLangDir();
    this.purchaseOrderResource = new PurchaseOrderResourceParameter();
  }

  displayedColumns: string[] = ['paymentDate', 'orderNumber', 'referenceNumber', 'amount', 'paymentMethod'];
  footerToDisplayed = ['footer']


  ngOnInit(): void {
    this.createSearchFormGroup();
    this.dataSource = new PurchasePaymentReportDataSource(this.purchasePaymentReportService);
    this.getResourceParameter();
    this.getBusinessLocations();

    this.dataSource.connect().subscribe((data: PurchaseOrderPayment[]) => {
      this.purchaseOrderPayments = data;
    });
  }

  createSearchFormGroup() {
    this.searchForm = this.fb.group({
      fromDate: [this.FromDate],
      toDate: [this.ToDate],
      filterProductValue: [''],
      locationId: [''],
    }, {
      validators: dateCompare()
    });
    this.purchaseOrderResource.fromDate = this.FromDate;
    this.purchaseOrderResource.toDate = this.ToDate;
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

  onSearch() {
    if (this.searchForm.valid) {
      this.purchaseOrderResource.fromDate = this.searchForm.get('fromDate')?.value;
      this.purchaseOrderResource.toDate = this.searchForm.get('toDate')?.value;
      this.purchaseOrderResource.locationId = this.searchForm.get('locationId')?.value;
      this.dataSource.loadData(this.purchaseOrderResource);
    }
  }

  onClear() {
    this.searchForm.reset();
    this.searchForm.get('locationId')?.setValue(this.locations[0]?.id);
    this.purchaseOrderResource.fromDate = this.searchForm.get('fromDate')?.value;
    this.purchaseOrderResource.toDate = this.searchForm.get('toDate')?.value;
    this.purchaseOrderResource.locationId = this.searchForm.get('locationId')?.value;
    this.dataSource.loadData(this.purchaseOrderResource);
  }

  ngAfterViewInit() {
    this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);

    this.sub$.sink = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        tap(() => {
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
    this.purchasePaymentReportService.getAllPurchaseOrderPaymentReportExcel(this.purchaseOrderResource)
      .subscribe((c: HttpResponse<PurchaseOrderPayment[]>) => {
        if (c.body) {
          const purchaseOrderPayments = [...c.body];
          let heading = [[
            this.translationService.getValue('PAYMENT_DATE'),
            this.translationService.getValue('PO_NUMBER'),
            this.translationService.getValue('REFERENCE_NUMBER'),
            this.translationService.getValue('AMOUNT'),
            this.translationService.getValue('PAID_BY')
          ]];

          let purchaseOrderPaymentReport: any = [];
          purchaseOrderPayments.forEach((purchaseOrderPayment: PurchaseOrderPayment) => {
            purchaseOrderPaymentReport.push([
              this.utcToLocalTime.transform(purchaseOrderPayment.paymentDate, 'shortDate'),
              purchaseOrderPayment.orderNumber,
              purchaseOrderPayment.referenceNumber,
              this.customCurrencyPipe.transform(purchaseOrderPayment.amount),
              this.paymentMethodPipe.transform(purchaseOrderPayment.paymentMethod)
            ]);
          });
          const title = this.translationService.getValue('PURCHASE_PAYMENT_REPORT');

          if (type === 'csv' || type === 'xlsx') {
            let workBook = XLSX.utils.book_new();
            XLSX.utils.sheet_add_aoa(workBook, heading);
            let workSheet = XLSX.utils.sheet_add_json(workBook, purchaseOrderPaymentReport, { origin: "A2", skipHeader: true });
            XLSX.utils.book_append_sheet(workBook, workSheet, this.translationService.getValue('PURCHASE_PAYMENT_REPORT'));
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
              body: purchaseOrderPaymentReport,
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

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.purchaseOrderPayments.indexOf(row);
  }
}
