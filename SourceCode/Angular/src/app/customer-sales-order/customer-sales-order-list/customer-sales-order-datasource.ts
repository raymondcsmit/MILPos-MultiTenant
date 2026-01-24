import { DataSource } from '@angular/cdk/table';
import { HttpResponse } from '@angular/common/http';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { BehaviorSubject, Observable, of, Subscription } from 'rxjs';
import { CustomerSalesOrder } from './customer-sales-order';
import { CustomerSalesOrderResourceParameter } from './customer-sales-order-resource-parameter';
import { CustomerSalesOrderService } from '../customer-sales-order.service';

export class CustomerSalesOrderDataSource implements DataSource<CustomerSalesOrder> {
  private _customerSalesOrderSubject$ = new BehaviorSubject<CustomerSalesOrder[]>([]);
  private _responseHeaderSubject$ = new BehaviorSubject<ResponseHeader>(new ResponseHeader());
  private loadingSubject = new BehaviorSubject<boolean>(false);

  public loading$ = this.loadingSubject.asObservable();
  private _count: number = 0;
  sub$!: Subscription;

  public get count(): number {
    return this._count;
  }
  public responseHeaderSubject$ = this._responseHeaderSubject$.asObservable();

  constructor(private customerSalesOrderService: CustomerSalesOrderService) {
  }

  connect(): Observable<CustomerSalesOrder[]> {
    this.sub$ = new Subscription();
    return this._customerSalesOrderSubject$.asObservable();
  }

  disconnect(): void {
    this._customerSalesOrderSubject$.complete();
    this.loadingSubject.complete();
    this.sub$.unsubscribe();
  }

  loadData(customerSalesOrderResource: CustomerSalesOrderResourceParameter) {
    this.loadingSubject.next(true);
    this.sub$ = this.customerSalesOrderService.getAllCustomerSalesOrder(customerSalesOrderResource)
      .subscribe(
        {
          next: (resp: HttpResponse<CustomerSalesOrder[]>) => {
            this.loadingSubject.next(false);
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
                this._customerSalesOrderSubject$.next(loginAuditTrails);
              }
            }
          },
          error: () => {
            this.loadingSubject.next(false);
          }
        }
      );
  }
}
