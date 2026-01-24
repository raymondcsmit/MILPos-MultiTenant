import { DataSource } from '@angular/cdk/table';
import { HttpResponse } from '@angular/common/http';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { BehaviorSubject, Observable, of, Subscription } from 'rxjs';
import { Transaction } from '../transaction';
import { TransactionResourceParameter } from './transaction-resource-parameter';
import { TransactionService } from '../transaction.service';

export class TransactionDataSource implements DataSource<Transaction> {
  private _transactionSubject$ = new BehaviorSubject<Transaction[]>([]);
  private _responseHeaderSubject$ = new BehaviorSubject<ResponseHeader>(new ResponseHeader());
  private loadingSubject = new BehaviorSubject<boolean>(false);

  public loading$ = this.loadingSubject.asObservable();
  private _count: number = 0;
  sub$!: Subscription;

  public get count(): number {
    return this._count;
  }
  public responseHeaderSubject$ = this._responseHeaderSubject$.asObservable();

  constructor(private transactionService: TransactionService) {
  }

  connect(): Observable<Transaction[]> {
    this.sub$ = new Subscription();
    return this._transactionSubject$.asObservable();
  }

  disconnect(): void {
    this._transactionSubject$.complete();
    this.loadingSubject.complete();
    this.sub$.unsubscribe();
  }

  loadData(transactionResource: TransactionResourceParameter) {
    this.loadingSubject.next(true);
    this.sub$ = this.transactionService.getAllTransaction(transactionResource)
      .subscribe(
        {
          next: (resp: HttpResponse<Transaction[]>) => {
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
              this._transactionSubject$.next(loginAuditTrails);
            }
          },
          error: () => {
            this.loadingSubject.next(false);
          }
        });
  }
}
