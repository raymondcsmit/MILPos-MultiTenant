import { DataSource } from '@angular/cdk/table';
import { HttpResponse } from '@angular/common/http';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { SalesOrder } from '@core/domain-classes/sales-order';
import { SalesOrderResourceParameter } from '@core/domain-classes/sales-order-resource-parameter';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { SalesOrderService } from './sales-order.service';

export class SalesOrderDataSource implements DataSource<SalesOrder> {
  private _salesOrderSubject$ = new BehaviorSubject<SalesOrder[]>([]);
  private _responseHeaderSubject$ = new BehaviorSubject<ResponseHeader>(new ResponseHeader());
  private loadingSubject = new BehaviorSubject<boolean>(false);

  public loading$ = this.loadingSubject.asObservable();
  private _count: number = 0;
  sub$!: Subscription;

  public get count(): number {
    return this._count;
  }
  public responseHeaderSubject$ = this._responseHeaderSubject$.asObservable();

  constructor(private salesOrderService: SalesOrderService) {
  }

  connect(): Observable<SalesOrder[]> {
    this.sub$ = new Subscription();
    return this._salesOrderSubject$.asObservable();
  }

  disconnect(): void {
    this._salesOrderSubject$.complete();
    this.loadingSubject.complete();
    this.sub$.unsubscribe();
  }

  loadData(salesOrderResource: SalesOrderResourceParameter) {
    this.loadingSubject.next(true);
    this.sub$ = this.salesOrderService.getAllSalesOrder(salesOrderResource)
      .subscribe((resp: HttpResponse<SalesOrder[]>) => {
        if (resp && resp.headers.get('X-Pagination')) {
          const paginationParam = JSON.parse(
            resp.headers.get('X-Pagination') ?? '{}'
          ) as ResponseHeader;
          this._responseHeaderSubject$.next(paginationParam);
        }
        if (resp && resp.body) {
          const expenses = [...resp.body];
          this._count = expenses.length;
          this._salesOrderSubject$.next(expenses);
        }
      });
  }
}
