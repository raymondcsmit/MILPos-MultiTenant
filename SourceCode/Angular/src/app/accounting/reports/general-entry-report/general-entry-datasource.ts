import { DataSource } from '@angular/cdk/table';
import { HttpResponse } from '@angular/common/http';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { BehaviorSubject, Observable, of, Subscription } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { GeneralEntry } from './general-entry';
import { GeneralEntryResourceParameter } from './general-entry-resource-parameter';
import { ReportService } from '../report.service';

export class GeneralEntryDataSource implements DataSource<GeneralEntry> {
  private _generalEntrySubject$ = new BehaviorSubject<GeneralEntry[]>([]);
  private _responseHeaderSubject$ = new BehaviorSubject<ResponseHeader>(new ResponseHeader());
  private loadingSubject = new BehaviorSubject<boolean>(false);

  public loading$ = this.loadingSubject.asObservable();
  private _count: number = 0;
  sub$!: Subscription;

  public get count(): number {
    return this._count;
  }
  public responseHeaderSubject$ = this._responseHeaderSubject$.asObservable();

  constructor(private reportService: ReportService) {
  }

  connect(): Observable<GeneralEntry[]> {
    this.sub$ = new Subscription();
    return this._generalEntrySubject$.asObservable();
  }

  disconnect(): void {
    this._generalEntrySubject$.complete();
    this.loadingSubject.complete();
    this.sub$.unsubscribe();
  }

  loadData(generalEntryResourceParameter: GeneralEntryResourceParameter) {
    this.loadingSubject.next(true);
    this.sub$ = this.reportService.getAllGeneralEntry(generalEntryResourceParameter)
      .subscribe((resp: HttpResponse<GeneralEntry[]>) => {
        if (resp && resp.headers) {
          if (resp && resp.headers.get('X-Pagination')) {
            const paginationParam = JSON.parse(
              resp.headers.get('X-Pagination') ?? '{}'
            ) as ResponseHeader;
            this._responseHeaderSubject$.next(paginationParam);
          }
          if (resp.body && resp.body.length > 0) {
            const loginAuditTrails = [...resp.body];
            this._count = loginAuditTrails.length;
            this._generalEntrySubject$.next(loginAuditTrails);
          }
        }
      });
  }
}
