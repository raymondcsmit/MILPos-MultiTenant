import { HttpResponse } from '@angular/common/http';
import { Component, OnInit, ViewChild } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { SalesOrderPayment } from '@core/domain-classes/sales-order-payment';
import { SalesOrderResourceParameter } from '@core/domain-classes/sales-order-resource-parameter';
import { dateCompare } from '@core/services/date-range';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { PaymentMethodPipe } from '@shared/pipes/payment-method.pipe';
import { PaymentStatusPipe } from '@shared/pipes/payment-status.pipe';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { merge, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SalesPaymentReportDataSource } from './sales-payment-report.datasource';
import { SalesPaymentReportService } from './sales-payment-report.service';
import * as XLSX from 'xlsx';
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
import { RouterModule } from '@angular/router';
import { BaseComponent } from '../../base.component';
import { MatCard, MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from '@core/services/toastr.service';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-sales-payment-report',
  templateUrl: './sales-payment-report.component.html',
  styleUrls: ['./sales-payment-report.component.scss'],
  providers: [
    UTCToLocalTime,
    CustomCurrencyPipe,
    PaymentStatusPipe,
    PaymentMethodPipe,
  ],
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
    MatCard,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    NgClass
  ]
})
export class SalesPaymentReportComponent
  extends BaseComponent
  implements OnInit {
  dataSource!: SalesPaymentReportDataSource;
  isData: boolean = false;
  isDeleted = false;
  salesOrderResource: SalesOrderResourceParameter;
  searchForm!: UntypedFormGroup;
  locations: BusinessLocation[] = [];
  salesOrderPayment: SalesOrderPayment[] = [];
  loading$!: Observable<boolean>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  currentDate: Date = this.CurrentDate;

  constructor(
    private salesPaymentReportService: SalesPaymentReportService,
    private commonService: CommonService,
    private fb: UntypedFormBuilder,
    private utcToLocalTime: UTCToLocalTime,
    private customCurrencyPipe: CustomCurrencyPipe,
    private paymentMethodPipe: PaymentMethodPipe,
    private dialog: MatDialog,
    private toastr: ToastrService
  ) {
    super();
    this.getLangDir();
    this.salesOrderResource = new SalesOrderResourceParameter();
  }

  displayedColumns: string[] = [
    'paymentDate',
    'orderNumber',
    'referenceNumber',
    'amount',
    'paymentMethod',
  ];
  footerToDisplayed = ['footer'];

  ngOnInit(): void {
    this.createSearchFormGroup();
    this.dataSource = new SalesPaymentReportDataSource(
      this.salesPaymentReportService
    );
    this.getBusinessLocations();
    this.getResourceParameter();

    this.dataSource.connect().subscribe((data: SalesOrderPayment[]) => {
      this.salesOrderPayment = data;
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
    this.salesOrderResource.locationId =
      this.searchForm.get('locationId')?.value;
    this.dataSource.loadData(this.salesOrderResource);
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
    this.salesPaymentReportService
      .getAllSalesOrderPaymentReportExcel(this.salesOrderResource)
      .subscribe((c: HttpResponse<SalesOrderPayment[]>) => {
        if (c.body) {
          const salesOrderPayments = [...c.body];
          let heading = [
            [
              this.translationService.getValue('PAYMENT_DATE'),
              this.translationService.getValue('SO_NUMBER'),
              this.translationService.getValue('REFERENCE_NUMBER'),
              this.translationService.getValue('AMOUNT'),
              this.translationService.getValue('PAID_BY'),
            ],
          ];

          let saleOrderPaymentReport: any = [];
          salesOrderPayments.forEach((salesOrderPayment: SalesOrderPayment) => {
            saleOrderPaymentReport.push([
              this.utcToLocalTime.transform(salesOrderPayment.paymentDate, 'shortDate'),
              salesOrderPayment.orderNumber,
              salesOrderPayment.referenceNumber,
              this.customCurrencyPipe.transform(salesOrderPayment.amount),
              this.paymentMethodPipe.transform(salesOrderPayment.paymentMethod),
            ]);
          });
          const title = this.translationService.getValue('SALES_PAYMENT_REPORT');

          if (type === 'csv' || type === 'xlsx') {
            let workBook = XLSX.utils.book_new();
            XLSX.utils.sheet_add_aoa(workBook, heading);
            let workSheet = XLSX.utils.sheet_add_json(
              workBook,
              saleOrderPaymentReport,
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
              body: saleOrderPaymentReport,
              startY: y
            });
            if (type === 'pdf') {
              doc.save(`${title}.pdf`);
            }
            else {
              const base64String = doc.output('datauristring').split(',')[1];
              const dialogRef = this.dialog.open(SendEmailComponent, {
                data: Object.assign({}, { blob: base64String, name: `${title}.pdf`, contentType: 'application/pdf', subject: `${title}  ${dateFilter}` }),
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
    return this.salesOrderPayment.indexOf(row);
  }
}
