import { DataSource } from '@angular/cdk/table';
import { HttpResponse } from '@angular/common/http';
import { Expense } from '@core/domain-classes/expense';
import { ExpenseResourceParameter } from '@core/domain-classes/expense-source-parameter';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { BehaviorSubject, Observable, of, Subscription } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { ExpenseService } from '../../expense/expense.service';

export class ExpenseReportDataSource implements DataSource<Expense> {
  private _expenseSubject$ = new BehaviorSubject<Expense[]>([]);
  private _responseHeaderSubject$ = new BehaviorSubject<ResponseHeader>(new ResponseHeader());
  private loadingSubject = new BehaviorSubject<boolean>(false);

  public loading$ = this.loadingSubject.asObservable();
  private _count: number = 0;
  private _totalAmount: number = 0;
  sub$!: Subscription;

  public get count(): number {
    return this._count;
  }

  public get totalAmount(): number {
    return this._totalAmount;
  }
  public responseHeaderSubject$ = this._responseHeaderSubject$.asObservable();

  constructor(private expenseService: ExpenseService) { }

  connect(): Observable<Expense[]> {
    this.sub$ = new Subscription();
    return this._expenseSubject$.asObservable();
  }

  disconnect(): void {
    this._expenseSubject$.complete();
    this.loadingSubject.complete();
    this.sub$.unsubscribe();
  }

  loadData(expenseResource: ExpenseResourceParameter) {
    this.loadingSubject.next(true);
    this.sub$ = this.expenseService
      .getExpenses(expenseResource)
      .subscribe((resp: HttpResponse<Expense[]>) => {
        this.loadingSubject.next(false)
        if (resp && resp.headers.get('X-Pagination')) {
          const headerValue = resp?.headers?.get('X-Pagination');
          const paginationParam = headerValue
            ? JSON.parse(headerValue) as ResponseHeader
            : new ResponseHeader();

          this._responseHeaderSubject$.next(paginationParam);
          if (resp.body) {
            const expenses = [...resp.body];
            this._count = expenses.length;
            this._expenseSubject$.next(expenses);
          }
        }
      });
  }
}
