import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { Observable } from 'rxjs/internal/Observable';
import { FinancialYear } from './financial-year';
import { CommonError } from '@core/error-handler/common-error';
import { catchError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FinancialYearService {
  constructor(
    private http: HttpClient,
    private commonHttpErrorService: CommonHttpErrorService
  ) { }

  getAllFinancialYear(): Observable<FinancialYear[]> {
    const url = `FinancialYear`;
    return this.http
      .get<FinancialYear[]>(url);
  }

  addFinancialYear(
    financialYear: FinancialYear
  ): Observable<FinancialYear | CommonError> {
    const url = 'FinancialYear';
    return this.http
      .post<FinancialYear>(url, financialYear)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  updateFinancialYear(
    id: string,
    financialYear: FinancialYear
  ): Observable<FinancialYear | CommonError> {
    const url = `FinancialYear/${id}`;
    return this.http
      .put<FinancialYear>(url, financialYear)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  getFinancialYear(id: string): Observable<FinancialYear> {
    const url = `FinancialYear/${id}`;
    return this.http
      .get<FinancialYear>(url);

  }

  deleteFinancialYear(id: string): Observable<FinancialYear | CommonError> {
    const url = `FinancialYear/${id}`
    return this.http.delete<FinancialYear>(url)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

}
