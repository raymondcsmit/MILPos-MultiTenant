import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { CashFlow } from './cash-flow';
import { ReportService } from '../report.service';
import { CommonService } from '@core/services/common.service';
import { MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { MatSelectModule } from '@angular/material/select';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatMenuModule } from '@angular/material/menu';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { SendEmailComponent } from '@shared/send-email/send-email.component';
import { BaseComponent } from '../../../base.component';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { FinancialYear } from '../../financial-year/financial-year';
import { ToastrService } from '@core/services/toastr.service';

@Component({
  selector: 'app-cash-flow-report',
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    CommonModule,
    TranslateModule,
    MatSelectModule,
    MatNativeDateModule,
    MatDatepickerModule,
    MatMenuModule,
    CustomCurrencyPipe,
    PageHelpTextComponent,
    HasClaimDirective,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
  ],
  templateUrl: './cash-flow-report.component.html',
  styleUrl: './cash-flow-report.component.scss',
})
export class CashFlowReportComponent extends BaseComponent implements OnInit {
  searchForm!: FormGroup;
  locations: BusinessLocation[] = [];
  financialYears: FinancialYear[] = [];
  cashFlow!: CashFlow | null;
  constructor(
    private reportService: ReportService,
    private commonService: CommonService,
    private fb: FormBuilder,
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
      fromDate: [this.FromDate, [Validators.required]],
      toDate: [this.ToDate, [Validators.required]],
      locationId: [''],
    });
  }

  getBusinessLocations() {
    this.commonService.getLocationsForReport().subscribe((locationResponse) => {
      this.locations = locationResponse.locations;
      if (this.locations?.length > 0) {
        this.searchForm.get('locationId')?.setValue(locationResponse.selectedLocation);
      }
      this.getReportData();
    });
  }

  getFinancialYears() {
    this.commonService.getFinancialYearsForReport().subscribe((financialResponse) => {
      this.financialYears = financialResponse.financialYears;
      if (this.locations?.length > 0) {
        this.searchForm.get('financialYearId')?.setValue(financialResponse.selectedFinancialYearId);
      }
      this.getReportData();
    });
  }

  getReportData() {
    if (!this.searchForm.valid) {
      this.searchForm.markAllAsTouched();
      return;
    }
    const fromDate = this.searchForm.get('fromDate')?.value;
    const toDate = this.searchForm.get('toDate')?.value;
    const locationId = this.searchForm.get('locationId')?.value;

    this.reportService
      .getCashFlowReport(fromDate, toDate, locationId)
      .subscribe((data: CashFlow) => {
        this.cashFlow = data;
      });
  }

  clearDates() {
    this.searchForm.patchValue({
      fromDate: null,
      toDate: null,
    });
  }

  onClear() {
    this.searchForm.get('fromDate')?.setValue('');
    this.searchForm.get('toDate')?.setValue('');
    if (this.locations?.length > 0) {
      this.searchForm.get('locationId')?.setValue(this.locations[0].id);
    } else {
      this.searchForm.get('locationId')?.setValue('');
    }
    this.cashFlow = null;
    this.getReportData();
  }

  onDownloadReport(type: string, sendEmail = false) {
    if (!this.cashFlow || this.cashFlow.cashFlowAccounts.length === 0) {
      this.toastr.error(this.translationService.getValue('NO_DATA_FOUND'));
      return;
    }

    const title = this.translationService.getValue('CASH_FLOW_REPORT');

    const heading = [
      [
        this.translationService.getValue('ACCOUNT_NAME'),
        this.translationService.getValue('DEBIT_AMOUNT'),
        this.translationService.getValue('CREDIT_AMOUNT'),
      ],
    ];

    const reportData = this.cashFlow.cashFlowAccounts.map((acc) => [
      acc.accountName,
      acc.debitAmount,
      acc.creditAmount,
    ]);

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

      // Date range
      const fromDate = this.searchForm.get('fromDate')?.value;
      const toDate = this.searchForm.get('toDate')?.value;

      if (fromDate && toDate) {
        doc.setFontSize(11);
        doc.text(
          `${this.translationService.getValue('PERIOD')} : ${new Date(
            fromDate
          ).toLocaleDateString()} - ${new Date(toDate).toLocaleDateString()}`,
          14,
          y
        );
        y += 6;
      }

      // Location
      const location = this.locations.find((l) => l.id == this.searchForm.get('locationId')?.value);
      if (location) {
        doc.text(`${this.translationService.getValue('LOCATION')} : ${location.name}`, 14, y);
        y += 6;
      }

      // Table
      autoTable(doc, {
        startY: y,
        head: heading,
        body: reportData,
      });
      y = (doc as any).lastAutoTable.finalY + 8;

      // Totals
      doc.setFontSize(12);
      doc.text(
        `${this.translationService.getValue('TOTAL_CASH_RECEIVED')} : ${this.cashFlow.totalCashRecived
        }`,
        14,
        y
      );
      y += 6;
      doc.text(
        `${this.translationService.getValue('TOTAL_CASH_PAID')} : ${this.cashFlow.totalCashPaid}`,
        14,
        y
      );
      y += 6;
      doc.text(
        `${this.translationService.getValue('NET_TOTAL_MOVEMENT')} : ${this.cashFlow.netTotalMovement
        }`,
        14,
        y
      );

      // ✅ Option 1: Save PDF locally
      if (!sendEmail) {
        doc.save(`${title}.pdf`);
      } else {
        // ✅ Option 2: Send via email (open SendEmailComponent dialog)
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
}
