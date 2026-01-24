import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { Observable } from 'rxjs/internal/Observable';
import { ProfitLoss } from './profit-loss-report/profit-loss';
import { TaxReport } from './tax-report/tax-report';
import { CashBankReport } from './cash-bank-report/cash-bank-report';
import { BalanceSheetReport } from './balance-sheet-report/balance-sheet';
import { LedgerAccountBalances } from './account-balance-report/ledger-account-balances';
import { GeneralEntryResourceParameter } from './general-entry-report/general-entry-resource-parameter';
import { GeneralEntry, GeneralEntryModel } from './general-entry-report/general-entry';
import { TrialBalance } from './trial-balance-report/trial-balance';
import { CashFlow } from './cash-flow-report/cash-flow';
import { PaymentReportResource } from './payment-report/model/payment-report-resource';
import { PaymentReportModel } from './payment-report/model/payment';
import { SalesSummary } from './daily-report-summary/model/daily-sales-summary';
import { PurchaseSummary } from './daily-report-summary/model/daily-purchase-summary';
import { PaymentSummary } from './daily-report-summary/model/daily-payment-summary';

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  constructor(
    private httpClient: HttpClient,
    private commonHttpErrorService: CommonHttpErrorService
  ) { }

  getProfitLossReport(
    financialYearId: string,
    locationId?: string
  ): Observable<ProfitLoss> {
    const url = `Reports/ProfitLoss`;
    const customParams = new HttpParams()
      .set('financialYearId', financialYearId)
      .set('branchId', locationId ?? '');
    return this.httpClient
      .get<ProfitLoss>(url, {
        params: customParams,
      });

  }

  getTaxReport(
    financialYearId: string,
    locationId?: string
  ): Observable<TaxReport> {
    const url = `Reports/taxreport`;
    const customParams = new HttpParams()
      .set('financialYearId', financialYearId)
      .set('branchId', locationId ?? '');
    return this.httpClient
      .get<TaxReport>(url, {
        params: customParams,
      });

  }

  getCashBankReport(
    financialYearId: string,
    locationId?: string
  ): Observable<CashBankReport> {
    const url = `Reports/cashbankreport`;
    const customParams = new HttpParams()
      .set('financialYearId', financialYearId)
      .set('branchId', locationId ?? '');
    return this.httpClient
      .get<CashBankReport>(url, {
        params: customParams,
      });

  }

  getBalanceSheetReport(
    financialYearId: string,
    locationId?: string
  ): Observable<BalanceSheetReport> {
    const url = `Reports/balancesheetreport`;
    const customParams = new HttpParams()
      .set('financialYearId', financialYearId)
      .set('branchId', locationId ?? '');
    return this.httpClient
      .get<BalanceSheetReport>(url, {
        params: customParams,
      });

  }

  getAccountBalanceReport(
    financialYearId: string,
    locationId?: string
  ): Observable<LedgerAccountBalances[]> {
    const url = `Reports/AccountBalancereport`;
    const customParams = new HttpParams()
      .set('financialYearId', financialYearId)
      .set('branchId', locationId ?? '');
    return this.httpClient
      .get<LedgerAccountBalances[]>(url, {
        params: customParams,
      });

  }

  getAllGeneralEntry(
    resourceParams: GeneralEntryResourceParameter
  ): Observable<HttpResponse<GeneralEntry[]>> {
    const url = 'Reports';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields)
      .set('orderBy', resourceParams.orderBy ?? '')
      .set('pageSize', resourceParams.pageSize.toString())
      .set('skip', resourceParams.skip.toString())
      .set('searchQuery', resourceParams.searchQuery)
      .set('name', resourceParams.name)
      .set('transactionNumber', resourceParams.transactionNumber ?? '')
      .set('branchId', resourceParams.branchId ?? '')
      .set('financialYearId', resourceParams.financialYearId ?? '')
      .set(
        'fromDate',
        resourceParams.fromDate ? resourceParams.fromDate.toISOString() : ''
      )
      .set(
        'toDate',
        resourceParams.toDate ? resourceParams.toDate.toISOString() : ''
      );
    return this.httpClient.get<GeneralEntry[]>(url, {
      params: customParams,
      observe: 'response',
    });
  }

  getAllPaymentReports(
    resourceParams: PaymentReportResource
  ): Observable<HttpResponse<PaymentReportModel[]>> {
    const url = 'Reports/Paymentreport';
    const customParams = new HttpParams()
      .set('orderBy', resourceParams.orderBy ?? '')
      .set('pageSize', resourceParams.pageSize.toString())
      .set('skip', resourceParams.skip.toString())
      .set('transactionNumber', resourceParams.transactionNumber ?? '')
      .set('amount', resourceParams.amount ? resourceParams.amount.toString() : '')
      .set('paymentFromDate', resourceParams.paymentFromDate ? resourceParams.paymentFromDate.toISOString() : '')
      .set('paymentToDate', resourceParams.paymentToDate ? resourceParams.paymentToDate.toISOString() : '')
      .set('branchId', resourceParams.branchId ?? '')
      .set('financialYearId', resourceParams.financialYearId ?? '');
    return this.httpClient.get<PaymentReportModel[]>(url, {
      params: customParams,
      observe: 'response',
    });
  }

  getTrialBalanceReport(
    fromDate: Date,
    toDate: Date,
    locationId?: string
  ): Observable<TrialBalance> {
    const url = `Reports/trialbalancereport`;
    const customParams = new HttpParams()
      .set('locationId', locationId ?? '')
      .set('fromDate', fromDate ? fromDate.toISOString() : '')
      .set('toDate', toDate ? toDate.toISOString() : '');
    return this.httpClient
      .get<TrialBalance>(url, {
        params: customParams,
      });

  }

  getCashFlowReport(
    fromDate: Date,
    toDate: Date,
    locationId?: string
  ): Observable<CashFlow> {
    const url = `Reports/cashflowreport`;
    const customParams = new HttpParams()
      .set('locationId', locationId ?? '')
      .set('fromDate', fromDate ? fromDate.toISOString() : '')
      .set('toDate', toDate ? toDate.toISOString() : '');
    return this.httpClient
      .get<CashFlow>(url, {
        params: customParams,
      });
  }

  getDailySalesSummary(toDate: Date): Observable<HttpResponse<SalesSummary>> {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const httpParams = new HttpParams()
      .set('DailyReportDate', toDate ? toDate.toDateString() : '')
      .set('timeZone', tz);
    const url = 'DailyReport/sale';
    return this.httpClient
      .get<SalesSummary>(url, {
        params: httpParams,
        observe: 'response'
      });
  }

  getDailyPurchaseSummary(toDate: Date): Observable<HttpResponse<PurchaseSummary>> {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const httpParams = new HttpParams()
      .set('DailyReportDate', toDate ? toDate.toDateString() : '')
      .set('timeZone', tz);
    const url = 'DailyReport/purchase';
    return this.httpClient
      .get<PurchaseSummary>(url, {
        params: httpParams,
        observe: 'response'
      });
  }

  getDailyPaymentSummary(toDate: Date): Observable<HttpResponse<PaymentSummary>> {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const httpParams = new HttpParams()
      .set('DailyReportDate', toDate ? toDate.toDateString() : '')
      .set('timeZone', tz);
    const url = 'DailyReport/payment';
    return this.httpClient
      .get<PaymentSummary>(url, {
        params: httpParams,
        observe: 'response'
      });
  }

  addGeneralEntry(generalEntry: GeneralEntryModel): Observable<GeneralEntryModel> {
    const url = 'GeneralEntry';
    return this.httpClient.post<GeneralEntryModel>(url, generalEntry);
  }
}
