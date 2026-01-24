import { HttpClient, HttpEvent, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EmailLogResource } from '@core/domain-classes/email-log-Resource';
import { EmailLogs } from '@core/domain-classes/email-logs';
import { CommonError } from '@core/error-handler/common-error';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { Observable, catchError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EmailLogService {

  constructor(
    private httpClient: HttpClient,
    private commonHttpErrorService: CommonHttpErrorService) { }

  getEmailLogs(resource: EmailLogResource): Observable<HttpResponse<EmailLogs[]>> {
    const url = `emaillog`;
    const customParams = new HttpParams()
      .set('fields', resource.fields)
      .set('orderBy', resource.orderBy)
      .set('pageSize', resource.pageSize.toString())
      .set('skip', resource.skip.toString())
      .set('searchQuery', resource.searchQuery)
      .set('senderEmail', resource.senderEmail ?? '')
      .set('recipientEmail', resource.recipientEmail ?? '')
      .set('subject', resource.subject ?? '');

    return this.httpClient.get<EmailLogs[]>(url, {
      params: customParams,
      observe: 'response'
    });
  }

  downloadAttachment(id: string): Observable<HttpEvent<Blob>> {
    const url = `emaillog/${id}/download`;
    return this.httpClient.get(url, {
      reportProgress: true,
      observe: 'events',
      responseType: 'blob',
    });
  }

  deleteEmailLog(id: string): Observable<void | CommonError> {
    const url = `emaillog/${id}`;
    return this.httpClient.delete<void>(url).pipe(catchError(this.commonHttpErrorService.handleError));
  }
}
