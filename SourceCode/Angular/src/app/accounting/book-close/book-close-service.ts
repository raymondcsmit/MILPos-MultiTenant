import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { catchError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BookCloseService {
  private http = inject(HttpClient);
  private commonHttpErrorService = inject(CommonHttpErrorService);

  constructor() { }

  closeFinancialYear() {
    const url = 'YearEndClosing';
    return this.http
      .post(url, null)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }
}
