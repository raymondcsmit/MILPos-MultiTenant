import { Routes } from '@angular/router';
import { AuthGuard } from '@core/security/auth.guard';
import { FinancialYearResolver } from './financial-year/financial-year.resolver';

export const ACCOUNTING_ROUTES: Routes = [
  {
    path: 'transactions',
    data: { claimType: 'ACCOUNTING_VIEW_TRANSACTIONS' },
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./transaction/transaction-list/transaction-list.component').then(
        (m) => m.TransactionListComponent
      ),
  },
  {
    path: 'financial-year',
    data: { claimType: 'ACCOUNTING_VIEW_FINANCIAL_YEARS' },
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./financial-year/financial-year-list/financial-year-list.component').then(
        (m) => m.FinancialYearListComponent
      ),
  },
  {
    path: 'profit-loss-report',
    data: { claimType: 'ACCOUNTING_VIEW_PROFIT_LOSS_REPORT' },
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./reports/profit-loss-report/profit-loss-report.component').then(
        (m) => m.ProfitLossReportComponent
      ),
  },
  {
    path: 'tax-report',
    data: { claimType: 'ACCOUNTING_VIEW_TAX_REPORT' },
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./reports/tax-report/tax-report.component').then((m) => m.TaxReportComponent),
  },
  {
    path: 'cash-bank-report',
    data: { claimType: 'ACCOUNTING_VIEW_CASH_BANK_REPORT' },
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./reports/cash-bank-report/cash-bank-report.component').then(
        (m) => m.CashBankReportComponent
      ),
  },
  {
    path: 'balance-sheet-report',
    data: { claimType: 'ACCOUNTING_VIEW_BALANCE_SHEET_REPORT' },
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./reports/balance-sheet-report/balance-sheet-report.component').then(
        (m) => m.BalanceSheetReportComponent
      ),
  },
  {
    path: 'account-balance-report',
    data: { claimType: 'ACCOUNTING_VIEW_ACCOUNT_BALANCE_REPORT' },
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./reports/account-balance-report/account-balance-report.component').then(
        (m) => m.AccountBalanceReportComponent
      ),
  },
  {
    path: 'general-entry-report',
    data: { claimType: 'ACCOUNTING_VIEW_GENERAL_ENTRY_REPORT' },
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./reports/general-entry-report/general-entry-report.component').then(
        (m) => m.GeneralEntryReportComponent
      ),
  },
  {
    path: 'trial-balance-report',
    data: { claimType: 'ACCOUNTING_VIEW_TRIAL_BALANCE_REPORT' },
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./reports/trial-balance-report/trial-balance-report.component').then(
        (m) => m.TrialBalanceReportComponent
      ),
  },
  {
    path: 'cash-flow-report',
    data: { claimType: 'ACCOUNTING_VIEW_CASH_FLOW_REPORT' },
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./reports/cash-flow-report/cash-flow-report.component').then(
        (m) => m.CashFlowReportComponent
      ),
  },
  {
    path: 'ledger-accounts',
    data: { claimType: 'ACCOUNTING_VIEW_LEDGER_ACCOUNTS' },
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./ledger-account/ledger-account-list/ledger-account-list.component').then(
        (m) => m.LedgerAccountListComponent
      ),
  },
  {
    path: 'loans',
    canActivate: [AuthGuard],
    data: { claimType: 'LOAN_VIEW_LOANS' },
    loadComponent: () => import('./loan/loan-list/loan-list').then((m) => m.LoanList),
  },
  {
    path: 'loan/addItem',
    data: { claimType: 'LOAN_MANAGE_LOAN' },
    canActivate: [AuthGuard],
    loadComponent: () => import('./loan/manage-loan/manage-loan').then((m) => m.ManageLoan),
  },
  {
    path: 'payment-report',
    // data: { claimType: 'ACCOUNTING_VIEW_PAYMENT_REPORT' },
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./reports/payment-report/payment-report').then(
        (m) => m.PaymentReport
      ),
  }
];
