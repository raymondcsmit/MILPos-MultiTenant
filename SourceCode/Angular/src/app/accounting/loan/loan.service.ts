import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { catchError, Observable } from 'rxjs';
import { Loan } from './model/loan';
import { LoanPayment } from './model/loan-payment';
import { CommonError } from '@core/error-handler/common-error';

@Injectable({
  providedIn: 'root'
})
export class LoanService {
  private http = inject(HttpClient);
  private commonHttpErrorService = inject(CommonHttpErrorService);

  constructor() { }

  getAllLoans(): Observable<Loan[] | CommonError> {
    const url = 'Loan';
    return this.http
      .get<Loan[]>(url)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  getLoanPaymentsById(id: string): Observable<LoanPayment[] | CommonError> {
    const url = `Loan/${id}`;
    return this.http
      .get<LoanPayment[]>(url)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  addLoan(loan: Loan) {
    const url = 'Loan';
    return this.http
      .post(url, loan)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  addLoanPayment(loanPayment: LoanPayment) {
    const url = 'Loan/Repayment';
    return this.http
      .post(url, loanPayment)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }
}
