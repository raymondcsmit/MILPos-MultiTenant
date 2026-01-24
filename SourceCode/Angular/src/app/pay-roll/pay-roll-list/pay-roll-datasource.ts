import { DataSource } from '@angular/cdk/table';
import { HttpResponse } from '@angular/common/http';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { BehaviorSubject, Observable, of, Subscription } from 'rxjs';
import { PayRoll } from '../pay-roll';
import { PayRollResourceParameter } from './pay-roll-resource-parameter';
import { PayRollService } from '../pay-roll.service';

export class PayRollDataSource implements DataSource<PayRoll> {
  private _payrollSubject$ = new BehaviorSubject<PayRoll[]>([]);
  private _responseHeaderSubject$ = new BehaviorSubject<ResponseHeader>(new ResponseHeader());
  private loadingSubject = new BehaviorSubject<boolean>(false);

  public loading$ = this.loadingSubject.asObservable();
  private _count: number = 0;
  sub$!: Subscription;

  public get count(): number {
    return this._count;
  }
  public responseHeaderSubject$ = this._responseHeaderSubject$.asObservable();

  constructor(private payRollService: PayRollService) {
  }

  connect(): Observable<PayRoll[]> {
    this.sub$ = new Subscription();
    return this._payrollSubject$.asObservable();
  }

  disconnect(): void {
    this._payrollSubject$.complete();
    this.loadingSubject.complete();
    this.sub$.unsubscribe();
  }

  loadData(payRollResource: PayRollResourceParameter) {
    this.loadingSubject.next(true);
    this.sub$ = this.payRollService.getAllPayRoll(payRollResource)
      .subscribe(
        {
          next: (resp: HttpResponse<PayRoll[]>) => {
            this.loadingSubject.next(false);
            if (resp && resp.headers.get('X-Pagination')) {
              const paginationParam = JSON.parse(
                resp.headers.get('X-Pagination') ?? '{}'
              ) as ResponseHeader;
              this._responseHeaderSubject$.next(paginationParam);
            }
            if (resp.body && resp.body.length > 0) {
              const loginAuditTrails = [...resp.body];
              this._count = loginAuditTrails.length;
              this._payrollSubject$.next(loginAuditTrails);
            }
          },
          error: () => {
            this.loadingSubject.next(false);
          }
        });
  }
}
