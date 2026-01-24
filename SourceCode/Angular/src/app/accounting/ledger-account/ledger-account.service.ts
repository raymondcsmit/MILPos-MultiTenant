import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { Observable } from 'rxjs/internal/Observable';
import { LedgerAccount, LedgerAccountsDictionary, LedgerAccountsWithAssetType } from './ledger-account';
import { catchError } from 'rxjs';
import { CommonError } from '@core/error-handler/common-error';

@Injectable({
  providedIn: 'root',
})
export class LedgerAccountService {
  constructor(
    private http: HttpClient,
    private commonHttpErrorService: CommonHttpErrorService
  ) { }

  getAllLedgerAccount(locationId: string): Observable<LedgerAccount[]> {
    const url = `LedgerAccount/${locationId}`;
    return this.http.get<LedgerAccount[]>(url);
  }
  getAllLedgerAccountGroupBy(locationId: string): Observable<LedgerAccountsWithAssetType[]> {
    const url = `LedgerAccount/${locationId}/groupby/accountType`;
    return this.http.get<LedgerAccountsWithAssetType[]>(url);
  }


  getLedgerAccounts(): Observable<LedgerAccount[] | CommonError> {
    const url = 'LedgerAccount/dropdown';
    return this.http
      .get<LedgerAccount[]>(url)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  addLedgerAccount(ledgerAccount: LedgerAccount): Observable<LedgerAccount | CommonError> {
    const url = 'LedgerAccount';
    return this.http
      .post<LedgerAccount>(url, ledgerAccount)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  updateLedgerAccount(ledgerAccount: LedgerAccount): Observable<LedgerAccount | CommonError> {
    const url = `LedgerAccount/${ledgerAccount.id}`;
    return this.http
      .put<LedgerAccount>(url, ledgerAccount)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }
}
