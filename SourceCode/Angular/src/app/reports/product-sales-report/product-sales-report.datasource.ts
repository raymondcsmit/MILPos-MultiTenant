import { DataSource } from '@angular/cdk/collections';
import { HttpResponse } from '@angular/common/http';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { SalesOrderItem } from '@core/domain-classes/sales-order-item';
import { SalesOrderResourceParameter } from '@core/domain-classes/sales-order-resource-parameter';
import { BehaviorSubject, Subscription, Observable, of } from 'rxjs';
import { SalesOrderService } from '../../sales-order/sales-order.service';

export class ProductSalesReportDataSource
  implements DataSource<SalesOrderItem> {
  private productSalesSubject$ = new BehaviorSubject<SalesOrderItem[]>([]);
  private _responseHeaderSubject$ = new BehaviorSubject<ResponseHeader>(new ResponseHeader());
  private loadingSubject = new BehaviorSubject<boolean>(false);

  public loading$ = this.loadingSubject.asObservable();
  private _count: number = 0;
  sub$!: Subscription;

  public get count(): number {
    return this._count;
  }
  public responseHeaderSubject$ = this._responseHeaderSubject$.asObservable();

  constructor(private salesOrderService: SalesOrderService) { }

  connect(): Observable<SalesOrderItem[]> {
    this.sub$ = new Subscription();
    return this.productSalesSubject$.asObservable();
  }

  disconnect(): void {
    this.productSalesSubject$.complete();
    this.loadingSubject.complete();
    this.sub$.unsubscribe();
  }

  loadData(customerResource: SalesOrderResourceParameter) {
    this.loadingSubject.next(true);
    this.sub$ = this.salesOrderService
      .getSalesOrderItemReport(customerResource)
      .subscribe((resp: HttpResponse<SalesOrderItem[]>) => {
        if (resp && resp.headers.get('X-Pagination')) {
          const paginationParam = JSON.parse(
            resp.headers.get('X-Pagination') ?? '{}'
          ) as ResponseHeader;
          this._responseHeaderSubject$.next(paginationParam);
        }
        if (resp && resp.body) {
          const expenses = [...resp.body];
          this._count = expenses.length;
          this.productSalesSubject$.next(expenses);
        }
      });
  }
}
