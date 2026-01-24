import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { FinancialYearStore } from '../../financial-year/financial-year-store';
import { ReportService } from '../report.service';
import { CommonService } from '@core/services/common.service';
import { TaxReport } from './tax-report';
import { MatTableModule } from '@angular/material/table';
import { TranslateModule } from '@ngx-translate/core';
import { MatSelectModule } from '@angular/material/select';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SendEmailComponent } from '@shared/send-email/send-email.component';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { BaseComponent } from '../../../base.component';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FinancialYear } from '../../financial-year/financial-year';
import { ToastrService } from '@core/services/toastr.service';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-tax-report',
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
  templateUrl: './tax-report.component.html',
  styleUrl: './tax-report.component.scss',
})
export class TaxReportComponent extends BaseComponent implements OnInit {
  searchForm!: FormGroup;
  locations: BusinessLocation[] = [];
  financialYears: FinancialYear[] = [];
  taxReport!: TaxReport | null;
  financialYearStore = inject(FinancialYearStore);
  constructor(
    private reportService: ReportService,
    private commonService: CommonService,
    private utcToLocalTime: UTCToLocalTime,
    private customCurrencyPipe: CustomCurrencyPipe,
    private dialog: MatDialog,
    private fb: FormBuilder,
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
    const financialYearId = this.searchForm.get('financialYearId')?.value;
    const locationId = this.searchForm.get('locationId')?.value;

    this.reportService.getTaxReport(financialYearId, locationId).subscribe((data: TaxReport) => {
      this.taxReport = data;
    });
  }

  onClear() {
    if (this.locations?.length > 0) {
      this.searchForm.get('locationId')?.setValue(this.locations[0].id);
    } else {
      this.searchForm.get('locationId')?.setValue('');
    }
    this.taxReport = null;
    this.getReportData();
  }

  onDownloadReport(type: string) {
    if (!this.taxReport || this.taxReport.netTaxPayable === 0) {
      this.toastr.error(this.translationService.getValue('NO_DATA_FOUND'));
      return;
    }

    const title = this.translationService.getValue('TAX_REPORT');

    // ✅ Summary section
    const summaryHeading = [
      [this.translationService.getValue('DESCRIPTION'), this.translationService.getValue('AMOUNT')],
    ];
    const summaryData = [
      [
        this.translationService.getValue('INPUT_GST_TOTAL'),
        this.customCurrencyPipe.transform(this.taxReport.inputGstTotal),
      ],
      [
        this.translationService.getValue('INPUT_GST_RETURN_TOTAL'),
        this.customCurrencyPipe.transform(this.taxReport.inputGstReturnTotal),
      ],
      [
        this.translationService.getValue('OUTPUT_GST_TOTAL'),
        this.customCurrencyPipe.transform(this.taxReport.outputGstTotal),
      ],
      [
        this.translationService.getValue('OUTPUT_GST_RETURN_TOTAL'),
        this.customCurrencyPipe.transform(this.taxReport.outputGstReturnTotal),
      ],
      [
        this.translationService.getValue('NET_TAX_PAYABLE'),
        this.customCurrencyPipe.transform(this.taxReport.netTaxPayable),
      ],
      [this.translationService.getValue('STATUS'), this.taxReport.status],
    ];

    // ✅ Child Taxes (Input / Output)
    const inputTaxesHeading = [
      [this.translationService.getValue('INPUT_TAX'), this.translationService.getValue('AMOUNT')],
    ];
    const inputTaxesData =
      this.taxReport.inputTaxes?.map((t) => [
        t.taxName,
        this.customCurrencyPipe.transform(t.amount),
      ]) || [];

    const outputTaxesHeading = [
      [this.translationService.getValue('OUTPUT_TAX'), this.translationService.getValue('AMOUNT')],
    ];
    const outputTaxesData =
      this.taxReport.outputTaxes?.map((t) => [
        t.taxName,
        this.customCurrencyPipe.transform(t.amount),
      ]) || [];

    // ✅ Excel / CSV
    if (type === 'csv' || type === 'xlsx') {
      const workBook = XLSX.utils.book_new();

      // Summary sheet
      const summarySheet = XLSX.utils.aoa_to_sheet([...summaryHeading, ...summaryData]);
      XLSX.utils.book_append_sheet(
        workBook,
        summarySheet,
        this.translationService.getValue('SUMMARY')
      );

      // Input taxes sheet
      if (inputTaxesData.length > 0) {
        const inputSheet = XLSX.utils.aoa_to_sheet([...inputTaxesHeading, ...inputTaxesData]);
        XLSX.utils.book_append_sheet(
          workBook,
          inputSheet,
          this.translationService.getValue('INPUT_TAXES')
        );
      }

      // Output taxes sheet
      if (outputTaxesData.length > 0) {
        const outputSheet = XLSX.utils.aoa_to_sheet([...outputTaxesHeading, ...outputTaxesData]);
        XLSX.utils.book_append_sheet(
          workBook,
          outputSheet,
          this.translationService.getValue('OUTPUT_TAXES')
        );
      }

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

      // Summary table
      autoTable(doc, {
        head: summaryHeading,
        body: summaryData,
        startY: y,
      });

      // Input taxes table
      if (inputTaxesData.length > 0) {
        autoTable(doc, {
          head: inputTaxesHeading,
          body: inputTaxesData,
          startY: (doc as any).lastAutoTable.finalY + 10,
          headStyles: { fillColor: [200, 230, 201] }, // light green
        });
      }

      // Output taxes table
      if (outputTaxesData.length > 0) {
        autoTable(doc, {
          head: outputTaxesHeading,
          body: outputTaxesData,
          startY: (doc as any).lastAutoTable.finalY + 10,
          headStyles: { fillColor: [255, 224, 178] }, // light orange
        });
      }

      if (type === 'pdf') {
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
