import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { TrialBalance } from './trial-balance';
import { ReportService } from '../report.service';
import { CommonService } from '@core/services/common.service';
import { MatTableModule } from '@angular/material/table';
import { TranslateModule } from '@ngx-translate/core';
import { MatSelectModule } from '@angular/material/select';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { SendEmailComponent } from '@shared/send-email/send-email.component';
import { BaseComponent } from '../../../base.component';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from '@core/services/toastr.service';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-trial-balance-report',
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    TranslateModule,
    MatSelectModule,
    MatNativeDateModule,
    MatDatepickerModule,
    MatMenuModule,
    CustomCurrencyPipe,
    PageHelpTextComponent,
    HasClaimDirective,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    NgClass
  ],
  templateUrl: './trial-balance-report.component.html',
  styleUrl: './trial-balance-report.component.scss',
})
export class TrialBalanceReportComponent extends BaseComponent implements OnInit {
  searchForm!: FormGroup;
  locations: BusinessLocation[] = [];
  financialYears = [];
  trialBalance!: TrialBalance | null;
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

  getReportData() {
    if (!this.searchForm.valid) {
      this.searchForm.markAllAsTouched();
      return;
    }
    const fromDate = this.searchForm.get('fromDate')?.value;
    const toDate = this.searchForm.get('toDate')?.value;
    const locationId = this.searchForm.get('locationId')?.value;

    this.reportService
      .getTrialBalanceReport(fromDate, toDate, locationId)
      .subscribe((data: TrialBalance) => {
        this.trialBalance = data;
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
    this.trialBalance = null;
    this.getReportData();
  }

  onDownloadReport(type: string, sendEmail = false) {
    if (!this.trialBalance || (this.trialBalance?.debitTotalAmount === 0) && (this.trialBalance?.creditTotalAmount === 0)) {
      this.toastr.error(this.translationService.getValue('NO_DATA_FOUND'));
      return;
    }

    const title = this.translationService.getValue('TRIAL_BALANCE_REPORT');

    const heading = [
      [
        this.translationService.getValue('ACCOUNT_NAME'),
        this.translationService.getValue('DEBIT_AMOUNT'),
        this.translationService.getValue('CREDIT_AMOUNT'),
      ],
    ];

    const reportData = this.trialBalance.trialBalanceAccounts.map((acc) => [
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
        `${this.translationService.getValue('TOTAL_DEBIT')} : ${this.trialBalance.debitTotalAmount
        }`,
        14,
        y
      );
      y += 6;
      doc.text(
        `${this.translationService.getValue('TOTAL_CREDIT')} : ${this.trialBalance.creditTotalAmount
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
