import { DataSource } from '@angular/cdk/collections';
import { HttpResponse } from '@angular/common/http';
import { CustomerPayment } from '@core/domain-classes/customer-payment';
import { CustomerResourceParameter } from '@core/domain-classes/customer-resource-parameter';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { BehaviorSubject, Subscription, Observable, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { CustomerService } from '../../customer/customer.service';

export class CustomerPaymentReportDataSource
  implements DataSource<CustomerPayment> {
  private _customerPaymentSubject$ = new BehaviorSubject<CustomerPayment[]>([]);
  private _responseHeaderSubject$ = new BehaviorSubject<ResponseHeader | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false);

  public loading$ = this.loadingSubject.asObservable();
  private _count: number = 0;
  sub$!: Subscription;

  public get count(): number {
    return this._count;
  }
  public responseHeaderSubject$ = this._responseHeaderSubject$.asObservable();

  constructor(private customerService: CustomerService) { }

  connect(): Observable<CustomerPayment[]> {
    this.sub$ = new Subscription();
    return this._customerPaymentSubject$.asObservable();
  }

  disconnect(): void {
    this._customerPaymentSubject$.complete();
    this.loadingSubject.complete();
    this.sub$.unsubscribe();
  }

  loadData(customerResource: CustomerResourceParameter) {
    this.loadingSubject.next(true);
    this.sub$ = this.customerService
      .getCustomerPayments(customerResource)
      .subscribe((resp: HttpResponse<CustomerPayment[]>) => {
        this.loadingSubject.next(false)
        if (resp && resp.headers && resp.headers.get('X-Pagination')) {

          const headerValue = resp?.headers?.get('X-Pagination');
          const paginationParam = headerValue
            ? JSON.parse(headerValue) as ResponseHeader
            : new ResponseHeader();

          this._responseHeaderSubject$.next(paginationParam);
          if (resp && resp.body) {
            const payments = [...resp.body];
            this._count = payments.length;
            this._customerPaymentSubject$.next(payments);
          }
        }
      });
  }
}
