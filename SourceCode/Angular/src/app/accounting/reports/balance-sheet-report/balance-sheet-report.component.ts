import { Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { FinancialYearStore } from '../../financial-year/financial-year-store';
import { ReportService } from '../report.service';
import { CommonService } from '@core/services/common.service';
import { MatTableModule } from '@angular/material/table';
import { TranslateModule } from '@ngx-translate/core';
import { MatSelectModule } from '@angular/material/select';
import { BalanceSheetReport } from './balance-sheet';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MatMenuModule } from '@angular/material/menu';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { MatDialog } from '@angular/material/dialog';
import { SendEmailComponent } from '@shared/send-email/send-email.component';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { BaseComponent } from '../../../base.component';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from '@angular/material/button';
import { FinancialYear } from '../../financial-year/financial-year';
import { ToastrService } from '@core/services/toastr.service';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-balance-sheet-report',
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    TranslateModule,
    MatSelectModule,
    MatMenuModule,
    PageHelpTextComponent,
    UTCToLocalTime,
    HasClaimDirective,
    CustomCurrencyPipe,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    NgClass
  ],
  providers: [UTCToLocalTime, CustomCurrencyPipe],
  templateUrl: './balance-sheet-report.component.html',
  styleUrl: './balance-sheet-report.component.scss',
})
export class BalanceSheetReportComponent
  extends BaseComponent
  implements OnInit {
  searchForm!: FormGroup;
  locations: BusinessLocation[] = [];
  financialYears: FinancialYear[] = [];
  balanceSheetReport!: BalanceSheetReport | null;
  financialYearStore = inject(FinancialYearStore);
  constructor(
    private reportService: ReportService,
    private commonService: CommonService,
    private fb: FormBuilder,
    private utcToLocalTime: UTCToLocalTime,
    private customCurrencyPipe: CustomCurrencyPipe,
    private dialog: MatDialog,
    private toastr: ToastrService
  ) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.createSearchFormGroup();
    this.getBusinessLocations();
    this.getFinancialYears();
  }

  createSearchFormGroup() {
    this.searchForm = this.fb.group({
      financialYearId: ['', [Validators.required]],
      locationId: [''],
    });
  }

  getBusinessLocations() {
    this.commonService.getLocationsForReport().subscribe((locationResponse) => {
      this.locations = locationResponse.locations;
      if (this.locations?.length > 0) {
        this.searchForm
          .get('locationId')
          ?.setValue(locationResponse.selectedLocation);
      }
      this.getReportData();
    });
  }

  getFinancialYears() {
    this.commonService.getFinancialYearsForReport().subscribe((financialResponse) => {
      this.financialYears = financialResponse.financialYears;
      if (this.locations?.length > 0) {
        this.searchForm
          .get('financialYearId')
          ?.setValue(financialResponse.selectedFinancialYearId);
      }
      this.getReportData();
    });
  }

  getReportData() {
    if (!this.searchForm.valid) {
      this.searchForm.markAllAsTouched();
      return;
    }
    const financialYearId = this.searchForm.get('financialYearId')?.value;
    const locationId = this.searchForm.get('locationId')?.value;

    this.reportService
      .getBalanceSheetReport(financialYearId, locationId)
      .subscribe((data: BalanceSheetReport) => {
        this.balanceSheetReport = data;
      });
  }

  onClear() {
    if (this.locations?.length > 0) {
      this.searchForm.get('locationId')?.setValue(this.locations[0].id);
    } else {
      this.searchForm.get('locationId')?.setValue('');
    }
    this.balanceSheetReport = null;
    this.getReportData();
  }

  onDownloadReport(type: string) {
    if (!this.balanceSheetReport || (this.balanceSheetReport?.totalLiabilities || 0) + (this.balanceSheetReport?.totalEquity || 0) === 0) {
      this.toastr.error(this.translationService.getValue('NO_DATA_FOUND'));
      return;
    }

    const title = this.translationService.getValue('BALANCE_SHEET_REPORT');

    const heading = [
      [
        this.translationService.getValue('SECTION'),
        this.translationService.getValue('ACCOUNT_NAME'),
        this.translationService.getValue('BALANCE'),
      ],
    ];

    const reportData = [
      ...this.balanceSheetReport.assets.map(a => [
        this.translationService.getValue('ASSETS'),
        a.accountName,
        this.customCurrencyPipe.transform(a.balance),
      ]),
      ...this.balanceSheetReport.liabilities.map(l => [
        this.translationService.getValue('LIABILITIES'),
        l.accountName,
        this.customCurrencyPipe.transform(l.balance),
      ]),
      ...this.balanceSheetReport.equity.map(e => [
        this.translationService.getValue('EQUITY'),
        e.accountName,
        this.customCurrencyPipe.transform(e.balance),
      ]),
      [],
      [this.translationService.getValue('TOTAL_ASSETS'), '', this.customCurrencyPipe.transform(this.balanceSheetReport.totalAssets)],
      [this.translationService.getValue('TOTAL_LIABILITIES'), '', this.customCurrencyPipe.transform(this.balanceSheetReport.totalLiabilities)],
      [this.translationService.getValue('TOTAL_EQUITY'), '', this.customCurrencyPipe.transform(this.balanceSheetReport.totalEquity)],
    ];

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

      // Center title
      const pageWidth = doc.internal.pageSize.getWidth();
      const titleWidth = doc.getTextWidth(title);
      const titleX = (pageWidth - titleWidth) / 2;
      doc.text(title, titleX, 10);

      doc.setFontSize(10);
      let y = 15;

      // Location
      const location = this.locations.find(
        l => l.id == this.searchForm.get('locationId')?.value
      );
      if (location) {
        doc.text(
          `${this.translationService.getValue('LOCATION')} :: ${location.name}`,
          14,
          y
        );
        y += 5;
      }

      // Financial Year
      const financialYear = this.financialYearStore
        .financialYears()
        .find(fy => fy.id == this.searchForm.get('financialYearId')?.value);

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

      // Table
      autoTable(doc, {
        head: heading,
        body: reportData,
        startY: y,
      });

      if (type === 'pdf') {
        // Save as PDF
        doc.save(`${title}.pdf`);
      } else {
        // 📧 Send Email
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

        dialogRef.afterClosed().subscribe(() => {
          // Optional callback after sending
        });
      }
    }
  }

}
