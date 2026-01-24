import { DataSource } from '@angular/cdk/table';
import { HttpResponse } from '@angular/common/http';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { BehaviorSubject, Observable, of, Subscription } from 'rxjs';
import { CustomerLadger } from '../customer-ladger';
import { CustomerLadgerResourceParameter } from './customer-ladger-resource-parameter';
import { CustomerLadgerService } from '../customer-ladger.service';

export class CustomerLadgerDataSource implements DataSource<CustomerLadger> {
  private _customerLadgerSubject$ = new BehaviorSubject<CustomerLadger[]>([]);
  private _responseHeaderSubject$ = new BehaviorSubject<ResponseHeader>(new ResponseHeader());
  private loadingSubject = new BehaviorSubject<boolean>(false);

  public loading$ = this.loadingSubject.asObservable();
  private _count: number = 0;
  sub$!: Subscription;

  public get count(): number {
    return this._count;
  }
  public responseHeaderSubject$ = this._responseHeaderSubject$.asObservable();

  constructor(private customerLadgerService: CustomerLadgerService) {
  }

  connect(): Observable<CustomerLadger[]> {
    this.sub$ = new Subscription();
    return this._customerLadgerSubject$.asObservable();
  }

  disconnect(): void {
    this._customerLadgerSubject$.complete();
    this.loadingSubject.complete();
    this.sub$.unsubscribe();
  }

  loadData(customerLadgerResource: CustomerLadgerResourceParameter) {
    this.loadingSubject.next(true);
    this.sub$ = this.customerLadgerService.getCustomerLadgers(customerLadgerResource)
      .subscribe(
        {
          next: (resp: HttpResponse<CustomerLadger[]>) => {
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
                this._customerLadgerSubject$.next(loginAuditTrails);
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
