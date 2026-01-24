import { Component, inject, input, OnInit } from '@angular/core';
import { BaseComponent } from '../../../../base.component';
import { LoanService } from '../../loan.service';
import { LoanPayment } from '../../model/loan-payment';
import { MatTableModule } from '@angular/material/table';
import { TranslateModule } from '@ngx-translate/core';
import { CustomCurrencyPipe } from "../../../../shared/pipes/custome-currency.pipe";
import { UTCToLocalTime } from "../../../../shared/pipes/utc-to-local-time.pipe";
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { MatCardModule } from '@angular/material/card';
import { TruncatePipe } from "../../../../shared/pipes/truncate.pipe";
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-loan-payment-list',
  imports: [
    MatTableModule,
    TranslateModule,
    CustomCurrencyPipe,
    UTCToLocalTime,
    PageHelpTextComponent,
    MatCardModule,
    TruncatePipe,
    NgClass
  ],
  templateUrl: './loan-payment-list.html',
  styleUrl: './loan-payment-list.scss'
})
export class LoanPaymentList extends BaseComponent implements OnInit {
  loanId = input.required<string>();
  displayedColumns: string[] = ['paymentDate', 'principalAmount', 'interestAmount', 'note'];
  loanService = inject(LoanService);
  loanPayments: any[] = [];



  constructor() {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.getLoanPayments();
  }

  getLoanPayments(): void {
    this.sub$.sink = this.loanService.getLoanPaymentsById(this.loanId()).subscribe({
      next: (res) => {
        const payments = res as LoanPayment[]
        if (payments && payments.length) {
          this.loanPayments = payments;
        }
      }
    });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.loanPayments.indexOf(row);
  }
}
