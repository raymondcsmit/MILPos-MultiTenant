import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { catchError } from 'rxjs';
import { OpeningBalanceModel } from './model/opening-balance';

@Injectable({
  providedIn: 'root'
})
export class OpeningBalanceService {
  private http = inject(HttpClient);
  private commonHttpErrorService = inject(CommonHttpErrorService);

  constructor() { }

  addOpeningBalance(openingBalance: OpeningBalanceModel) {
    const url = 'LedgerAccount/opening-balance';
    return this.http
      .post(url, openingBalance)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }
}
