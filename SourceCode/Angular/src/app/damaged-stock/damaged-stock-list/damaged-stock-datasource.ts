import { DataSource } from '@angular/cdk/table';
import { HttpResponse } from '@angular/common/http';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { BehaviorSubject, Observable, of, Subscription } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { DamagedStock } from '@core/domain-classes/damaged-stock';
import { DamagedStockResourceParameter } from '@core/domain-classes/damaged-stock-resource-parameter';
import { DamagedStockService } from '../damaged-stock.service';

export class DamagedStockDataSource implements DataSource<DamagedStock> {
  private _entities$ = new BehaviorSubject<DamagedStock[]>([]);
  private _responseHeaderSubject$ = new BehaviorSubject<ResponseHeader>(new ResponseHeader());
  private loadingSubject$ = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject$.asObservable();
  private _count: number = 0;
  sub$: Subscription;

  public get count(): number {
    return this._count;
  }
  public responseHeaderSubject$ = this._responseHeaderSubject$.asObservable();

  constructor(private damagedStockService: DamagedStockService) {
    this.sub$ = new Subscription();
  }

  connect(): Observable<DamagedStock[]> {
    return this._entities$.asObservable();
  }

  disconnect(): void {
    this._entities$.complete();
    this.loadingSubject$.complete();
    this.sub$.unsubscribe();
  }

  loadData(resource: DamagedStockResourceParameter) {
    this.loadingSubject$.next(true);
    this.sub$ = this.damagedStockService
      .getDamagedStocks(resource)
      .subscribe((resp: HttpResponse<DamagedStock[]>) => {
        if (resp && resp.headers.get('X-Pagination')) {
          const paginationParam = JSON.parse(
            resp.headers.get('X-Pagination') ?? '{}'
          ) as ResponseHeader;
          this._responseHeaderSubject$.next(paginationParam);
        }
        if (resp && resp.body) {
          const damagedStock = [...resp.body];
          this._count = damagedStock.length;
          this._entities$.next(damagedStock);
        }

      });
  }
}
