import { DataSource } from '@angular/cdk/table';
import { HttpResponse } from '@angular/common/http';
import { StockTransferResourceParameter } from '@core/domain-classes/stockTransfer-resource-parameter';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { BehaviorSubject, Observable, of, Subscription } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { StockTransferService } from '../stock-transfer.service';
import { StockTransfer } from '@core/domain-classes/stockTransfer';

export class StockTransferDataSource implements DataSource<StockTransfer> {
  private _entities$ = new BehaviorSubject<StockTransfer[]>([]);
  private _responseHeaderSubject$ = new BehaviorSubject<ResponseHeader>(new ResponseHeader());
  private loadingSubject$ = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject$.asObservable();
  private _count: number = 0;
  sub$!: Subscription;

  public get count(): number {
    return this._count;
  }
  public responseHeaderSubject$ = this._responseHeaderSubject$.asObservable();

  constructor(private stockTransferService: StockTransferService) {
    this.sub$ = new Subscription();
  }

  connect(): Observable<StockTransfer[]> {
    return this._entities$.asObservable();
  }

  disconnect(): void {
    this._entities$.complete();
    this.loadingSubject$.complete();
    this.sub$.unsubscribe();
  }

  loadData(resource: StockTransferResourceParameter) {
    this.loadingSubject$.next(true);
    this.sub$ = this.stockTransferService
      .getStockTransfers(resource)
      .subscribe((resp: HttpResponse<StockTransfer[]>) => {
        if (resp && resp.headers.get('X-Pagination')) {
          const paginationParam = JSON.parse(
            resp.headers.get('X-Pagination') ?? '{}'
          ) as ResponseHeader;
          this._responseHeaderSubject$.next(paginationParam);
        }
        if (resp && resp.body) {
          const stockTransfer = [...resp.body];
          this._count = stockTransfer.length;
          this._entities$.next(stockTransfer);
        }
      });
  }
}
