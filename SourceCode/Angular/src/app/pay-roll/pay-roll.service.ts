import { HttpClient, HttpEvent, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { Observable } from 'rxjs/internal/Observable';
import { CommonError } from '@core/error-handler/common-error';
import { catchError } from 'rxjs';
import { PayRollResourceParameter } from './pay-roll-list/pay-roll-resource-parameter';
import { PayRoll } from './pay-roll';
import { Employee } from './employee';

@Injectable({
  providedIn: 'root',
})
export class PayRollService {
  constructor(private http: HttpClient, private commonHttpErrorService: CommonHttpErrorService) {}

  getAllPayRoll(resourceParams: PayRollResourceParameter): Observable<HttpResponse<PayRoll[]>> {
    const url = 'PayRoll';
    const customParams = new HttpParams()
      .set('fields', resourceParams.fields)
      .set('orderBy', resourceParams.orderBy ?? '')
      .set('pageSize', resourceParams.pageSize.toString())
      .set('skip', resourceParams.skip.toString())
      .set('searchQuery', resourceParams.searchQuery)
      .set('name', resourceParams.name)
      .set('employeeId', resourceParams.employeeId ?? '')
      .set('branchId', resourceParams.branchId ?? '')
      .set('salaryMonth', resourceParams.salaryMonth ?? '')
      .set('paymentMode', resourceParams.paymentMode ?? '')
      .set('fromDate', resourceParams.fromDate ? resourceParams.fromDate.toISOString() : '')
      .set('toDate', resourceParams.toDate ? resourceParams.toDate.toISOString() : '');
    return this.http.get<PayRoll[]>(url, {
      params: customParams,
      observe: 'response',
    });
  }

  addPayRoll(formData: FormData): Observable<PayRoll | CommonError> {
    const url = 'PayRoll';
    return this.http
      .post<PayRoll>(url, formData) // <-- FormData instead of JSON
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  getEmployeesForDropDown(searchString: string, id?: string): Observable<Employee[]> {
    const url = 'PayRoll/employeeSearch';
    let params = `?searchQuery=${searchString ? searchString.trim() : ''}&pageSize=10&id=${
      id ? id : ''
    }`;
    return this.http.get<Employee[]>(url + params);
  }

  downloadAttachment(fileName: string): Observable<HttpEvent<Blob>> {
    const url = `PayRoll/download/${fileName}`;
    return this.http.get(url, {
      reportProgress: true,
      observe: 'events',
      responseType: 'blob',
    });
  }
}
