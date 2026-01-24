import { DataSource } from '@angular/cdk/table';
import { HttpResponse } from '@angular/common/http';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';
import { PurchaseOrderService } from '../purchase-order.service';
import { PurchaseOrderResourceParameter } from '@core/domain-classes/purchase-order-resource-parameter';

export class PurchaseOrderDataSource implements DataSource<PurchaseOrder> {
  private _purchaseOrderSubject$ = new BehaviorSubject<PurchaseOrder[]>([]);
  private _responseHeaderSubject$ = new BehaviorSubject<ResponseHeader>(new ResponseHeader());
  private loadingSubject = new BehaviorSubject<boolean>(false);

  public loading$ = this.loadingSubject.asObservable();
  private _count: number = 0;
  sub$!: Subscription;

  public get count(): number {
    return this._count;
  }
  public responseHeaderSubject$ = this._responseHeaderSubject$.asObservable();

  constructor(private purchaseOrderService: PurchaseOrderService) {
  }

  connect(): Observable<PurchaseOrder[]> {
    this.sub$ = new Subscription();
    return this._purchaseOrderSubject$.asObservable();
  }

  disconnect(): void {
    this._purchaseOrderSubject$.complete();
    this.loadingSubject.complete();
    this.sub$.unsubscribe();
  }

  loadData(purchaseOrderResource: PurchaseOrderResourceParameter) {
    this.loadingSubject.next(true);
    this.sub$ = this.purchaseOrderService.getAllPurchaseOrder(purchaseOrderResource)
      .subscribe((resp: HttpResponse<PurchaseOrder[]>) => {
        if (resp && resp.headers.get('X-Pagination')) {
          const paginationParam = JSON.parse(
            resp.headers.get('X-Pagination') ?? '{}'
          ) as ResponseHeader;
          this._responseHeaderSubject$.next(paginationParam);
        }
        if (resp && resp.body) {
          const loginAuditTrails = [...resp.body];
          this._count = loginAuditTrails.length;
          this._purchaseOrderSubject$.next(loginAuditTrails);
        }
      });
  }
}
