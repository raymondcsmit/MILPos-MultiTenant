import { DataSource } from '@angular/cdk/table';
import { HttpResponse } from '@angular/common/http';
import { ProductResourceParameter } from '@core/domain-classes/product-resource-parameter';
import { ProductStockAlert } from '@core/domain-classes/product-stock-alert';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { BehaviorSubject, Observable, of, Subscription } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { DashboardService } from '../dashboard.service';

export class ProductStockAlertDataSource implements DataSource<ProductStockAlert> {
  private _entities$ = new BehaviorSubject<ProductStockAlert[]>([]);
  private _responseHeaderSubject$ = new BehaviorSubject<ResponseHeader>(new ResponseHeader());
  private loadingSubject$ = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject$.asObservable();
  private _count: number = 0;
  sub$: Subscription;

  public get count(): number {
    return this._count;
  }
  public responseHeaderSubject$ = this._responseHeaderSubject$.asObservable();

  constructor(private dashboardService: DashboardService) {
    this.sub$ = new Subscription();
  }

  connect(): Observable<ProductStockAlert[]> {
    return this._entities$.asObservable();
  }

  disconnect(): void {
    this._entities$.complete();
    this.loadingSubject$.complete();
    this.sub$.unsubscribe();
  }

  loadData(resource: ProductResourceParameter) {
    this.loadingSubject$.next(true);
    this.sub$ = this.dashboardService
      .getProductStockAlerts(resource)
      .subscribe((resp: HttpResponse<ProductStockAlert[]>) => {
        if (resp && resp.headers) {

          if (resp && resp.headers.get('X-Pagination')) {
            const paginationParam = JSON.parse(
              resp.headers.get('X-Pagination') ?? '{}'
            ) as ResponseHeader;
            this._responseHeaderSubject$.next(paginationParam);
          }
          if (resp && resp.body) {
            const stockAlerts = [...resp.body];
            this._count = stockAlerts.length;
            this._entities$.next(stockAlerts);
          }
        }
      });
  }
}
