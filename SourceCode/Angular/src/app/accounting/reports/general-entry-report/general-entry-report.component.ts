import { AfterViewInit, Component, inject, ViewChild } from '@angular/core';
import { GeneralEntryStore } from './general-entry-store';
import { GeneralEntryResourceParameter } from './general-entry-resource-parameter';
import { debounceTime, distinctUntilChanged, merge, Observable, Subject, tap } from 'rxjs';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule, SortDirection } from '@angular/material/sort';
import { AccountType } from '../../account-enum';
import { CommonService } from '@core/services/common.service';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AccountTypePipe } from '../../ledger-account/account-type.pipe';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { FinancialYearStore } from '../../financial-year/financial-year-store';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatMenuModule } from '@angular/material/menu';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { MatDialog } from '@angular/material/dialog';
import { GeneralEntry } from './general-entry';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SendEmailComponent } from '@shared/send-email/send-email.component';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { BaseComponent } from '../../../base.component';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { FinancialYear } from '../../financial-year/financial-year';
import { TransactionTypePipe } from '../../transaction/transaction-type.pipe';
import { ToastrService } from '@core/services/toastr.service';
import { ReportService } from '../report.service';
import { AddGeneralEntry } from '../../add-general-entry/add-general-entry';
@Component({
  selector: 'app-general-entry-report',
  imports: [
    MatTableModule,
    MatSelectModule,
    MatSortModule,
    MatPaginatorModule,
    FormsModule,
    CommonModule,
    MatIconModule,
    AccountTypePipe,
    ReactiveFormsModule,
    MatNativeDateModule,
    MatDatepickerModule,
    MatMenuModule,
    PageHelpTextComponent,
    TranslateModule,
    UTCToLocalTime,
    HasClaimDirective,
    CustomCurrencyPipe,
    MatCardModule,
    MatButtonModule,
    TransactionTypePipe
  ],
  providers: [UTCToLocalTime, CustomCurrencyPipe],
  templateUrl: './general-entry-report.component.html',
  styleUrl: './general-entry-report.component.scss',
})
export class GeneralEntryReportComponent extends BaseComponent implements AfterViewInit {
  displayedColumns: string[] = [
    'createdDate',
    'transactionNumber',
    'transactionType',
    'accountCode',
    'accountName',
    'debitAmount',
    'creditAmount',
    'accountType',
  ];
  searchForm!: FormGroup;
  locations: BusinessLocation[] = [];
  financialYears: FinancialYear[] = [];
  footerToDisplayed: string[] = ['footer'];
  financialYearStore = inject(FinancialYearStore);
  generalEntryStore = inject(GeneralEntryStore);
  generalService = inject(ReportService);
  generalEntryResource: GeneralEntryResourceParameter = {
    ...this.generalEntryStore.generalEntryResourceParameter(),
  };
  loading$!: Observable<boolean>;
  loading = this.generalEntryStore.isLoading();
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  public filterObservable$: Subject<string> = new Subject<string>();
  AccountType = AccountType;

  accountType = Object.keys(AccountType)
    .filter((key) => !isNaN(Number(AccountType[key as any])))
    .map((key) => ({
      label: key,
      value: AccountType[key as keyof typeof AccountType],
    }));
  orderByColumn: string = '';
  orderByDirection: SortDirection = 'asc';

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private utcToLocalTime: UTCToLocalTime,
    private customCurrencyPipe: CustomCurrencyPipe,
    private dialog: MatDialog,
    private toastr: ToastrService
  ) {
    super();
    this.getLangDir();
    this.createSearchFormGroup();
    this.getBusinessLocations();
    this.getFinancialYears();
  }

  ngOnInit(): void {
    const orderBy = this.generalEntryStore.generalEntryResourceParameter()?.orderBy?.split(' ');

    if (orderBy?.length) {
      this.orderByColumn = orderBy[0];
      this.orderByDirection = orderBy[1]?.toLowerCase() === 'desc' ? 'desc' : 'asc';
    }

    this.sub$.sink = this.filterObservable$
      .pipe(debounceTime(1000), distinctUntilChanged())
      .subscribe((c) => {
        this.generalEntryResource.skip = 0;
        if (this.paginator) {
          this.paginator.pageIndex = 0;
        }
        this.generalEntryStore.loadByQuery(this.generalEntryResource);
      });
  }

  createSearchFormGroup() {
    this.searchForm = this.fb.group({
      financialYearId: [''],
      branchId: [''],
      fromDate: [''],
      toDate: [''],
      transactionNumber: [''],
    });
  }

  clearDates() {
    this.searchForm.patchValue({
      fromDate: null,
      toDate: null,
    });
  }

  refresh() {
    this.generalEntryStore.loadByQuery(this.generalEntryResource);
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
          this.generalEntryResource.skip = this.paginator.pageIndex * this.paginator.pageSize;
          this.generalEntryResource.pageSize = this.paginator.pageSize;
          this.generalEntryResource.orderBy = this.sort.active + ' ' + this.sort.direction;
          this.generalEntryStore.loadByQuery(this.generalEntryResource);
        })
      )
      .subscribe();

    if (this.financialYears?.length) {
      this.onSearch();
    }
  }

  onSearch() {
    if (!this.searchForm.valid) {
      this.searchForm.markAllAsTouched();
      return;
    }

    const formValue = this.searchForm.value;

    this.generalEntryResource.transactionNumber = formValue?.transactionNumber || '';
    this.generalEntryResource.fromDate = formValue.fromDate;
    this.generalEntryResource.toDate = formValue.toDate;
    this.generalEntryResource.branchId = formValue.branchId;
    this.generalEntryResource.financialYearId = formValue.financialYearId;
    this.generalEntryResource.skip = 0;
    if (this.paginator) {
      this.paginator.pageIndex = 0;
    }

    this.generalEntryStore.loadByQuery(this.generalEntryResource);
  }

  onClear() {
    this.searchForm.get('transactionNumber')?.setValue('');
    this.searchForm.get('fromDate')?.setValue('');
    this.searchForm.get('toDate')?.setValue('');
    this.searchForm.get('branchId')?.setValue('');

    this.generalEntryResource = {
      ...this.generalEntryStore.generalEntryResourceParameter(),
    };

    if (this.locations?.length > 0) {
      const defaultBranch = this.searchForm.get('branchId')?.value || this.locations[0].id;
      this.generalEntryResource.branchId = defaultBranch;
      this.searchForm.get('branchId')?.setValue(defaultBranch);
    }

    this.paginator.pageIndex = 0;
    this.generalEntryStore.loadByQuery(this.generalEntryResource);
  }

  onDownloadReport(type: string) {
    this.generalEntryResource.pageSize = 0;
    this.generalEntryResource.skip = 0;
    this.generalService.getAllGeneralEntry(this.generalEntryResource).subscribe({
      next: (generalEntrysWithHeader) => {
        const entries: GeneralEntry[] = generalEntrysWithHeader.body || [];
        if (!entries || entries.length === 0) {
          this.toastr.error(this.translationService.getValue('NO_DATA_FOUND'));
          return;
        }

        const title = this.translationService.getValue('GENERAL_ENTRY_REPORT');

        const heading = [
          [
            this.translationService.getValue('DATE'),
            this.translationService.getValue('TRANSACTION_NO'),
            this.translationService.getValue('ACCOUNT_CODE'),
            this.translationService.getValue('ACCOUNT_NAME'),
            this.translationService.getValue('DEBIT_AMOUNT'),
            this.translationService.getValue('CREDIT_AMOUNT'),
            this.translationService.getValue('ACCOUNT_TYPE'),
          ],
        ];

        const reportData = entries.map((e) => [
          new Date(e.createdDate).toLocaleDateString(),
          e.transactionNumber,
          e.accountCode,
          e.accountName,
          this.customCurrencyPipe.transform(e.debitAmount),
          this.customCurrencyPipe.transform(e.creditAmount),
          this.accountType.find((a) => a.value === e.accountType)?.label || '',
        ]);

        // 🔹 Excel / CSV
        if (type === 'csv' || type === 'xlsx') {
          const workBook = XLSX.utils.book_new();
          const workSheet = XLSX.utils.aoa_to_sheet([...heading, ...reportData]);
          XLSX.utils.book_append_sheet(workBook, workSheet, title);
          XLSX.writeFile(workBook, `${title}.${type}`);
        } else {
          // 🔹 PDF
          const doc = new jsPDF();
          doc.setFontSize(16);

          const pageWidth = doc.internal.pageSize.getWidth();
          const titleWidth = doc.getTextWidth(title);
          const titleX = (pageWidth - titleWidth) / 2;
          doc.text(title, titleX, 10);

          doc.setFontSize(10);
          let y = 15;

          // Location
          const location = this.locations.find((l) => l.id == this.searchForm.get('branchId')?.value);
          if (location) {
            doc.text(
              `${this.translationService.getValue('BUSINESS_LOCATION')} :: ${location.name}`,
              14,
              y
            );
            y += 5;
          }

          // Financial Year
          const financialYear = this.financialYearStore
            .financialYears()
            .find((fy) => fy.id == this.searchForm.get('financialYearId')?.value);

          if (financialYear) {
            const startDate = this.utcToLocalTime.transform(financialYear.startDate, 'shortDate');
            const endDate = this.utcToLocalTime.transform(financialYear.endDate, 'shortDate');

            doc.text(
              `${this.translationService.getValue('FINANCIAL_YEAR')} :: ${startDate} - ${endDate}`,
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

          if (type === 'pdf') {
            doc.save(`${title}.pdf`);
          } else {
            // 📧 Send via email
            const base64String = doc.output('datauristring').split(',')[1];
            const dialogRef = this.dialog.open(SendEmailComponent, {
              data: {
                blob: base64String,
                name: `${title}.pdf`,
                contentType: 'application/pdf',
                subject: title,
              },
              direction: this.langDir,
              minWidth: '40vw',
            });
            dialogRef.afterClosed().subscribe(() => { });
          }
        }
      }
    });
  }

  addGeneralEntry() {
    const dialogRef = this.dialog.open(AddGeneralEntry, {
      maxWidth: '35vw',
      width: '100%',
      maxHeight: '90vh',
      disableClose: true,
    });

    this.sub$.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.generalEntryResource.skip = 0;
        if (this.paginator) {
          this.paginator.pageIndex = 0;
        }
        this.generalEntryStore.loadByQuery(this.generalEntryResource);
      }
    });
  }
}
