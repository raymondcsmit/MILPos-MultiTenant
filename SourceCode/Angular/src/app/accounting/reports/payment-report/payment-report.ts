import { AfterViewInit, Component, inject, OnInit, ViewChild } from '@angular/core';
import { BaseComponent } from '../../../base.component';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { CommonService } from '@core/services/common.service';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { FinancialYear } from '../../financial-year/financial-year';
import { FinancialYearStore } from '../../financial-year/financial-year-store';
import { PaymentReportResource } from './model/payment-report-resource';
import { ReportService } from '../report.service';
import { PaymentReportModel } from './model/payment';
import { debounceTime, merge, Subject, tap } from 'rxjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { SendEmailComponent } from '@shared/send-email/send-email.component';
import { MatDialog } from '@angular/material/dialog';
import { CustomCurrencyPipe } from "../../../shared/pipes/custome-currency.pipe";
import { TruncatePipe } from "../../../shared/pipes/truncate.pipe";
import { PaymentMethodPipe } from "../../../shared/pipes/payment-method.pipe";
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-payment-report',
  imports: [
    MatTableModule,
    MatCardModule,
    MatSelectModule,
    TranslateModule,
    MatPaginator,
    MatSortModule,
    MatMenuModule,
    MatIconModule,
    MatDatepickerModule,
    MatButtonModule,
    ReactiveFormsModule,
    PageHelpTextComponent,
    UTCToLocalTime,
    FormsModule,
    CustomCurrencyPipe,
    TruncatePipe,
    PaymentMethodPipe,
    NgClass
  ],
  providers: [UTCToLocalTime],
  templateUrl: './payment-report.html',
  styleUrl: './payment-report.scss'
})
export class PaymentReport extends BaseComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = [
    'paymentDate',
    'transactionNumber',
    'referenceNumber',
    'paymentMethod',
    'amount',
    'narration',
    'branch'
  ];
  displayedSearchColumns: string[] = [
    'paymentDate-search',
    'transactionNumber-search',
    'referenceNumber-search',
    'paymentMethod-search',
    'amount-search',
    'narration-search',
    'branch-search'
  ];
  footerToDisplayed: string[] = ['footer'];
  searchForm!: FormGroup;
  fb = inject(FormBuilder);
  commonService = inject(CommonService);
  financialYearStore = inject(FinancialYearStore);
  reportService = inject(ReportService);
  dialog = inject(MatDialog);
  utcToLocalTime = inject(UTCToLocalTime);
  locations: BusinessLocation[] = [];
  financialYears: FinancialYear[] = [];
  payments: PaymentReportModel[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  paymentReportResource: PaymentReportResource = {
    paymentToDate: null,
    paymentFromDate: null,
    transactionNumber: '',
    amount: null,
    pageSize: 10,
    orderBy: 'paymentDate desc',
    skip: 0,
    totalCount: 0,
    searchQuery: '',
    name: '',
    fields: '',
    branchId: '',
    financialYearId: ''
  };
  public filterObservable$: Subject<string> = new Subject<string>();
  _paymentFromDateFilter = this.paymentReportResource.paymentFromDate ?? null;
  _paymentToDateFilter = this.paymentReportResource.paymentToDate ?? null;
  _transactionNumberFilter: string = this.paymentReportResource.transactionNumber ?? '';
  _amountFilter: number | null = this.paymentReportResource.amount;

  get paymentFromDateFilter(): Date | null {
    return this._paymentFromDateFilter as Date | null;
  }
  set paymentFromDateFilter(value: Date | null) {
    if (this._paymentFromDateFilter !== value) {
      this._paymentFromDateFilter = value;
      const paymentFromDateFilter = `paymentFromDate#${value?.toISOString() ?? 'null'}`;
      this.filterObservable$.next(paymentFromDateFilter);
    }
  }

  get paymentToDateFilter(): Date | null {
    return this._paymentToDateFilter as Date | null;
  }
  set paymentToDateFilter(value: Date | null) {
    if (this._paymentToDateFilter !== value) {
      this._paymentToDateFilter = value;
      const paymentToDateFilter = `paymentToDate#${value?.toISOString() ?? 'null'}`;
      this.filterObservable$.next(paymentToDateFilter);
    }
  }

  get transactionNumberFilter(): string {
    return this._transactionNumberFilter;
  }
  set transactionNumberFilter(value: string) {
    if (this._transactionNumberFilter !== value) {
      this._transactionNumberFilter = value;
      const transactionNumberFilter = `transactionNumber#${value}`;
      this.filterObservable$.next(transactionNumberFilter);
    }
  }

  get amountFilter(): number | null {
    return this._amountFilter;
  }
  set amountFilter(value: number | null) {
    if (this._amountFilter !== value) {
      this._amountFilter = value;
      const amountFilter = `amount#${value}`;
      this.filterObservable$.next(amountFilter);
    }
  }

  constructor() {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.createSearchFormGroup();
    this.getBusinessLocations();
    this.getFinancialYears();

    this.sub$.sink = this.filterObservable$
      .pipe(debounceTime(1000))
      .subscribe((res) => {
        const filterArray: Array<string> = res.split('#');
        this.paymentReportResource.skip = 0;
        if (this.paginator) {
          this.paginator.pageIndex = 0;
        }

        if (filterArray[0] === 'transactionNumber') {
          this.paymentReportResource.transactionNumber = filterArray[1];
        } else if (filterArray[0] === 'amount') {
          this.paymentReportResource.amount = Number(filterArray[1]);
        } else if (filterArray[0] === 'paymentFromDate') {
          if (filterArray[1] !== 'null') {
            this.paymentReportResource.paymentFromDate = new Date(filterArray[1]);
            this.paymentReportResource.paymentToDate = this.paymentToDateFilter;
          } else {
            this.paymentReportResource.paymentFromDate = null;
            this.paymentReportResource.paymentToDate = null;
          }
        }
        else if (filterArray[0] === 'paymentToDate') {
          if (filterArray[1] !== 'null') {
            this.paymentReportResource.paymentToDate = new Date(filterArray[1]);
            this.paymentReportResource.paymentFromDate = this.paymentFromDateFilter;
          } else {
            this.paymentReportResource.paymentToDate = null;
            this.paymentReportResource.paymentFromDate = null;
          }
        }
        this.loadPaymentsReports(this.paymentReportResource);
      });
  }

  createSearchFormGroup() {
    this.searchForm = this.fb.group({
      financialYearId: [''],
      branchId: [''],
      fromDate: [''],
      toDate: [''],
    });
  }

  clearDates() {
    this.paymentFromDateFilter = null;
    this.paymentToDateFilter = null;
  }

  refresh() {
    this.loadPaymentsReports(this.paymentReportResource);
  }

  getBusinessLocations() {
    this.commonService.getLocationsForReport().subscribe((locationResponse) => {
      this.locations = locationResponse.locations;
      if (this.locations?.length > 0) {
        this.searchForm.get('branchId')?.setValue(locationResponse.selectedLocation);
      }
    });
  }

  getFinancialYears() {
    this.commonService.getFinancialYearsForReport().subscribe((financialResponse) => {
      this.financialYears = financialResponse.financialYears;
      if (this.locations?.length > 0) {
        this.searchForm.get('financialYearId')?.setValue(financialResponse.selectedFinancialYearId);
      }
    });
  }

  ngAfterViewInit() {
    this.sort.sortChange.subscribe(() => (this.paginator.pageIndex = 0));

    this.sub$.sink = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        tap(() => {
          this.paymentReportResource.skip = this.paginator.pageIndex * this.paginator.pageSize;
          this.paymentReportResource.pageSize = this.paginator.pageSize;

          const active = this.sort.active ?? 'paymentDate';
          const direction = this.sort.direction || 'desc';
          this.paymentReportResource.orderBy = `${active} ${direction}`;

          this.loadPaymentsReports(this.paymentReportResource);
        })
      )
      .subscribe();

    if (this.financialYears?.length) {
      this.onSearch();
    }
  }

  loadPaymentsReports(paymentReportResource: PaymentReportResource) {
    this.sub$.sink = this.reportService
      .getAllPaymentReports(paymentReportResource)
      .subscribe({
        next: (paymentReportsWithHeader) => {
          const paymentReports: PaymentReportModel[] = paymentReportsWithHeader.body || [];
          if (paymentReports) {
            this.payments = paymentReports;
          }
          if (paymentReportsWithHeader.headers.get('x-pagination')) {
            const pagination: PaymentReportResource = JSON.parse(paymentReportsWithHeader.headers.get('x-pagination') ?? '');
            this.paymentReportResource = { ...paymentReportResource, totalCount: pagination.totalCount };
          }
        }
      });
  }

  onSearch() {
    if (!this.searchForm.valid) {
      this.searchForm.markAllAsTouched();
      return;
    }

    const formValue = this.searchForm.getRawValue();

    this.paymentReportResource.branchId = formValue.branchId;
    this.paymentReportResource.financialYearId = formValue.financialYearId;
    this.paymentReportResource.skip = 0;
    if (this.paginator) {
      this.paginator.pageIndex = 0;
    }

    this.loadPaymentsReports(this.paymentReportResource);
  }

  onClear() {
    this.searchForm.get('branchId')?.setValue('');

    if (this.locations?.length > 0) {
      const defaultBranch = this.searchForm.get('branchId')?.value || this.locations[0].id;
      this.paymentReportResource.branchId = defaultBranch;
      this.searchForm.get('branchId')?.setValue(defaultBranch);
    }

    this.paginator.pageIndex = 0;
    this.loadPaymentsReports(this.paymentReportResource);
  }

  onDownloadReport(type: string) {
    this.paymentReportResource.pageSize = 0;
    this.paymentReportResource.skip = 0;
    this.reportService.getAllPaymentReports(this.paymentReportResource).subscribe({
      next: (paymentReportsWithHeader) => {
        if (paymentReportsWithHeader && paymentReportsWithHeader.body) {
          const entries: PaymentReportModel[] = paymentReportsWithHeader.body ?? [];
          if (!entries || entries.length === 0) {
            return;
          }
          const title = 'Payment_Report';
          const heading = [
            [
              'Payment Date',
              'Transaction Number',
              'Reference Number',
              'Payment Method',
              'Amount',
              'Narration',
              'Branch'
            ],
          ];
          const reportData = entries.map((e) => [
            new Date(e.paymentDate).toLocaleDateString(),
            e.transactionNumber,
            e.referenceNumber,
            e.paymentMethod,
            e.amount,
            e.narration,
            e.branchName,
          ]);
          // Excel / CSV
          if (type === 'csv' || type === 'xlsx') {
            const workBook = XLSX.utils.book_new();
            const workSheet = XLSX.utils.aoa_to_sheet([...heading, ...reportData]);
            XLSX.utils.book_append_sheet(workBook, workSheet, title);
            // Add type name to the title, e.g., "Payment Report-25/26"
            let typeName = title;
            const financialYear = this.financialYears.find((fy) => fy.id == this.searchForm.get('financialYearId')?.value);
            if (financialYear) {
              const startDate = new Date(financialYear.startDate).getFullYear().toString();
              const endDate = new Date(financialYear.endDate).getFullYear().toString();
              typeName = `${title}_${startDate}_${endDate}`;
            }
            XLSX.writeFile(workBook, `${typeName}.${type}`);
          } else {
            const doc = new jsPDF();
            doc.setFontSize(16);
            const pageWidth = doc.internal.pageSize.getWidth();
            const titleWidth = doc.getTextWidth(title);
            const titleX = (pageWidth - titleWidth) / 2;
            doc.text('Payment Report', titleX, 10);
            doc.setFontSize(10);
            let y = 15;
            // Location
            const location = this.locations.find((l) => l.id == this.searchForm.get('branchId')?.value);
            if (location) {
              doc.text(
                `Business Location :: ${location.name}`,
                14,
                y
              );
              y += 5;
            }
            // Financial Year
            const financialYear = this.financialYears.find((fy) => fy.id == this.searchForm.get('financialYearId')?.value);
            if (financialYear) {
              const startDate = this.utcToLocalTime.transform(financialYear.startDate, 'shortDate');
              const endDate = this.utcToLocalTime.transform(financialYear.endDate, 'shortDate');
              doc.text(
                `Financial Year :: ${startDate} - ${endDate}`,
                14,
                y
              );
              y += 5;
            }
            autoTable(doc, {
              head: heading,
              body: reportData,
              startY: y,
            });
            // Add type name to the title, e.g., "Payment Report-25/26"
            let typeName = title;
            if (financialYear) {
              const startDate = new Date(financialYear.startDate).getFullYear().toString();
              const endDate = new Date(financialYear.endDate).getFullYear().toString();
              typeName = `${title}_${startDate}_${endDate}`;
            }
            if (type === 'pdf') {
              doc.save(`${typeName}.pdf`);
            } else {
              // 📧 Send via email
              const base64String = doc.output('datauristring').split(',')[1];
              const dialogRef = this.dialog.open(SendEmailComponent, {
                data: {
                  blob: base64String,
                  name: `${typeName}.pdf`,
                  contentType: 'application/pdf',
                  subject: typeName,
                },
                direction: this.langDir,
                minWidth: '40vw',
              });
              dialogRef.afterClosed().subscribe(() => { });
            }
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
    return this.payments.indexOf(row);
  }
}
