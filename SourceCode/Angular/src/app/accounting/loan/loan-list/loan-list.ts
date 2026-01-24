import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { BaseComponent } from '../../../base.component';
import { Loan } from '../model/loan';
import { TableSettingsStore } from '../../../table-setting/table-setting-store';
import { UTCToLocalTime } from '../../../shared/pipes/utc-to-local-time.pipe';
import { LoanPaymentList } from './loan-payment-list/loan-payment-list';
import { MatDialog } from '@angular/material/dialog';
import { ManageLoanPayment } from '../manage-loan-payment/manage-loan-payment';
import { LoanService } from '../loan.service';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-loan-list',
  imports: [
    MatTableModule,
    PageHelpTextComponent,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    TranslateModule,
    RouterLink,
    UTCToLocalTime,
    LoanPaymentList,
    HasClaimDirective,
    NgClass
  ],
  templateUrl: './loan-list.html',
  styleUrl: './loan-list.scss'
})
export class LoanList extends BaseComponent implements OnInit {
  displayedColumns: string[] = [
    'action',
    'loanName',
    'loanNumber',
    'loanDate',
    'loanAmount',
    'paidPrincipal',
    'paidInterest',
    'lenderName',
    'branch',
  ];
  loans: Loan[] = [];
  tableSettingsStore = inject(TableSettingsStore);
  dialog = inject(MatDialog);
  loanService = inject(LoanService);
  expandedElement!: Loan | null;

  constructor(private cd: ChangeDetectorRef) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.getAllLoans();
  }

  getAllLoans() {
    this.sub$.sink = this.loanService.getAllLoans().subscribe((loans) => {
      const loanData = loans as Loan[];
      if (loanData && loanData.length > 0) {
        this.loans = loanData;
        this.cd.detectChanges();
      }
    });
  }

  toggleRow(loan: Loan) {
    this.expandedElement = this.expandedElement === loan ? null : loan;
    this.cd.detectChanges();
  }

  openLOanPaymentDialog(loan: Loan) {
    this.expandedElement = null;
    const dialogRef = this.dialog.open(ManageLoanPayment, {
      maxWidth: '40vw',
      width: '100%',
      data: loan ? loan : {},
    });

    this.sub$.sink = dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.getAllLoans();
      }
    });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.loans.indexOf(row);
  }
}
