import { DataSource } from '@angular/cdk/table';
import { HttpResponse } from '@angular/common/http';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { EmailLogs } from '@core/domain-classes/email-logs';
import { EmailLogService } from './email-log.service';
import { EmailLogResource } from '@core/domain-classes/email-log-Resource';

export class EmailLogDataSource implements DataSource<EmailLogs> {
  private emailLogSubject$ = new BehaviorSubject<EmailLogs[]>([]);
  public responseHeaderSubject$ = new BehaviorSubject<ResponseHeader>(new ResponseHeader());
  private loadingSubject = new BehaviorSubject<boolean>(false);

  public loading$ = this.loadingSubject.asObservable();
  private _count: number = 0;

  public get count(): number {
    return this._count;
  }

  constructor(private emailLogService: EmailLogService) { }

  connect(): Observable<EmailLogs[]> {
    return this.emailLogSubject$.asObservable();
  }

  disconnect(): void {
    this.emailLogSubject$.complete();
    this.loadingSubject.complete();
  }

  loadEmailLogs(emailLogResource: EmailLogResource) {
    this.loadingSubject.next(true);
    this.emailLogService
      .getEmailLogs(emailLogResource)
      .subscribe((resp: HttpResponse<EmailLogs[]>) => {

        if (resp && resp.headers.get('X-Pagination')) {
          const paginationParam = JSON.parse(
            resp.headers.get('X-Pagination') ?? '{}'
          ) as ResponseHeader;
          this.responseHeaderSubject$.next(paginationParam);
        }
        if (resp && resp.body) {
          const expenses = [...resp.body];
          this._count = expenses.length;
          this.emailLogSubject$.next(expenses);
        }

      });
  }
}
