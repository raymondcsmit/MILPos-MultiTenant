import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SalesVsPurchase } from '@core/domain-classes/sales-purchase';
import { CommonError } from '@core/error-handler/common-error';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SalesPurchaseReportService {

  constructor(private httpClient: HttpClient,
    private commonHttpErrorService: CommonHttpErrorService) { }

  getSalesVsPurchaseReport(fromDate: Date, toDate: Date, locationId?: string): Observable<SalesVsPurchase[]> {
    const url = `dashboard/salesvspurchase`;
    const customParams = new HttpParams()
      .set('fromDate', fromDate.toISOString())
      .set('toDate', toDate.toDateString())
      .set('locationId', locationId ?? '');

    return this.httpClient.get<SalesVsPurchase[]>(url, {
      params: customParams
    });
  }
}
