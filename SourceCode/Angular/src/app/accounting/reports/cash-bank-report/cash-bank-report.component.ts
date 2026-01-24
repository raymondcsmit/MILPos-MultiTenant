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
import { CashBankReport } from './cash-bank-report';
import { MatTableModule } from '@angular/material/table';
import { TranslateModule } from '@ngx-translate/core';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { MatDialog } from '@angular/material/dialog';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SendEmailComponent } from '@shared/send-email/send-email.component';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { BaseComponent } from '../../../base.component';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from '@angular/material/button';
import { FinancialYear } from '../../financial-year/financial-year';
import { ToastrService } from '@core/services/toastr.service';

@Component({
  selector: 'app-cash-bank-report',
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    TranslateModule,
    MatSelectModule,
    MatMenuModule,
    CustomCurrencyPipe,
    MatButtonModule,
    HasClaimDirective,
    UTCToLocalTime,
    PageHelpTextComponent,
    MatCardModule,
    MatIconModule
  ],
  providers: [UTCToLocalTime, CustomCurrencyPipe],
  templateUrl: './cash-bank-report.component.html',
  styleUrl: './cash-bank-report.component.scss',
})
export class CashBankReportComponent extends BaseComponent implements OnInit {
  searchForm!: FormGroup;
  locations: BusinessLocation[] = [];
  financialYears: FinancialYear[] = [];
  cashBankReport!: CashBankReport | null;
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
      .getCashBankReport(financialYearId, locationId)
      .subscribe((data: CashBankReport) => {
        this.cashBankReport = data;
      });
  }

  onClear() {
    if (this.locations?.length > 0) {
      this.searchForm.get('locationId')?.setValue(this.locations[0].id);
    } else {
      this.searchForm.get('locationId')?.setValue('');
    }
    this.cashBankReport = null;
    this.getReportData();
  }

  onDownloadReport(type: string , sendEmail? : boolean) {
    if (!this.cashBankReport || (this.cashBankReport?.cashTotal || 0) + (this.cashBankReport?.bankTotal || 0) === 0) {
      this.toastr.error(this.translationService.getValue('NO_DATA_FOUND'));
      return;
    }

    const title = this.translationService.getValue('CASH_BANK_REPORT');

    // ✅ Table headings & data
    const summaryHeading = [[this.translationService.getValue('DESCRIPTION'), this.translationService.getValue('AMOUNT')]];
    const summaryData = [
      [this.translationService.getValue('CASH_TOTAL'), this.customCurrencyPipe.transform(this.cashBankReport.cashTotal)],
      [this.translationService.getValue('BANK_TOTAL'), this.customCurrencyPipe.transform(this.cashBankReport.bankTotal)],
    ];

    // ✅ Excel / CSV
    if (type === 'csv' || type === 'xlsx') {
      const workBook = XLSX.utils.book_new();
      const summarySheet = XLSX.utils.aoa_to_sheet([...summaryHeading, ...summaryData]);
      XLSX.utils.book_append_sheet(workBook, summarySheet, this.translationService.getValue('SUMMARY'));
      XLSX.writeFile(workBook, `${title}.${type}`);
    } else {
      // ✅ PDF
      const doc = new jsPDF();
      doc.setFontSize(16);
      const pageWidth = doc.internal.pageSize.getWidth();
      const titleWidth = doc.getTextWidth(title);
      const titleX = (pageWidth - titleWidth) / 2;
      doc.text(title, titleX, 10);

      doc.setFontSize(10);
      let y = 15;

      const locationName = this.locations.find(
        (x) => x.id == this.searchForm.get('locationId')?.value
      )?.name;
      if (locationName) {
        doc.text(
          `${this.translationService.getValue('BUSINESS_LOCATION')} :: ${locationName}`,
          14,
          y
        );
        y += 5;
      }

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
        head: summaryHeading,
        body: summaryData,
        startY: y,
      });

      if (!sendEmail) {
        doc.save(`${title}.pdf`);
      } else {
        const base64String = doc.output('datauristring').split(',')[1];
        const dialogRef = this.dialog.open(SendEmailComponent, {
          data: {
            blob: base64String,
            name: `${title}.pdf`,
            contentType: 'application/pdf',
            subject: `${title}`,
          },
          direction: this.langDir,
          minWidth: '40vw',
        });
        dialogRef.afterClosed().subscribe(() => { });
      }
    }
  }

}
