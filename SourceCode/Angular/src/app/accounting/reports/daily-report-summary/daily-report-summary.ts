import { Component, inject, Inject, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { ReportService } from '../report.service';
import { BaseComponent } from '../../../base.component';
import { SalesSummary } from './model/daily-sales-summary';
import { PaymentSummary } from './model/daily-payment-summary';
import { PurchaseSummary } from './model/daily-purchase-summary';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-daily-report-summary',
  imports: [
    MatDialogModule,
    MatIconModule,
    PageHelpTextComponent,
    TranslateModule,
    MatCardModule,
    CustomCurrencyPipe,
    MatTooltipModule
  ],
  templateUrl: './daily-report-summary.html',
  styleUrl: './daily-report-summary.scss'
})
export class DailyReportSummary extends BaseComponent implements OnInit {
  reportService = inject(ReportService);
  salesSummary: SalesSummary = {} as SalesSummary;
  purchaseSummary: PurchaseSummary = {} as PurchaseSummary;
  paymentSummary: PaymentSummary = {} as PaymentSummary;
  toDate: Date = new Date();

  constructor(
    public dialogRef: MatDialogRef<DailyReportSummary>
  ) {
    super();
  }

  ngOnInit() {
    this.getDailySalesSummary(this.toDate);
    this.getDailyPurchaseSummary(this.toDate);
    this.getDailyPaymentSummary(this.toDate);
  }

  getDailySalesSummary(toDate: Date) {
    this.sub$.sink = this.reportService.getDailySalesSummary(toDate).subscribe((report) => {
      if (report && report.body) {
        this.salesSummary = report.body;
      }
    });
  }

  getDailyPurchaseSummary(toDate: Date) {
    this.sub$.sink = this.reportService.getDailyPurchaseSummary(toDate).subscribe((report) => {
      if (report && report.body) {
        this.purchaseSummary = report.body;
      }
    });
  }

  getDailyPaymentSummary(toDate: Date) {
    this.sub$.sink = this.reportService.getDailyPaymentSummary(toDate).subscribe((report) => {
      if (report && report.body) {
        this.paymentSummary = report.body;
      }
    });
  }

  onCancel() {
    this.dialogRef.close();
  }
}
