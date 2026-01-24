import { DataSource } from '@angular/cdk/table';
import { HttpResponse } from '@angular/common/http';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { BehaviorSubject, Observable, of, Subscription } from 'rxjs';
import { InventoryHistory } from '@core/domain-classes/inventory-history';
import { InventoryService } from '../../inventory.service';
import { InventoryHistoryResourceParameter } from '@core/domain-classes/inventory-history-resource-parameter';

export class InventoryHistoryDataSource
  implements DataSource<InventoryHistory> {
  private _entities$ = new BehaviorSubject<InventoryHistory[]>([]);
  private _responseHeaderSubject$ = new BehaviorSubject<ResponseHeader>(new ResponseHeader());
  private loadingSubject$ = new BehaviorSubject<boolean>(false);

  public loading$ = this.loadingSubject$.asObservable();
  private _count: number = 0;
  sub$: Subscription;

  public get count(): number {
    return this._count;
  }
  public responseHeaderSubject$ = this._responseHeaderSubject$.asObservable();

  constructor(private inventoryService: InventoryService) {
    this.sub$ = new Subscription();
  }

  connect(): Observable<InventoryHistory[]> {
    return this._entities$.asObservable();
  }

  disconnect(): void {
    this._entities$.complete();
    this.loadingSubject$.complete();
    this.sub$.unsubscribe();
  }

  loadData(inventoryHistoryResource: InventoryHistoryResourceParameter) {
    this.loadingSubject$.next(true);
    this.sub$ = this.inventoryService
      .getInventoryHistories(inventoryHistoryResource)
      .subscribe((resp: HttpResponse<InventoryHistory[]>) => {
        if (resp && resp.headers.get('X-Pagination')) {
          const paginationParam = JSON.parse(
            resp.headers.get('X-Pagination') ?? '{}'
          ) as ResponseHeader;
          this._responseHeaderSubject$.next(paginationParam);
        }
        if (resp && resp.body) {
          const inventoryHistory = [...resp.body];
          this._count = inventoryHistory.length;
          this._entities$.next(inventoryHistory);
        }
      });
  }
}
