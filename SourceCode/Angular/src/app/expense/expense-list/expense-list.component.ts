import { HttpEventType, HttpResponse } from '@angular/common/http';
import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { Router, RouterModule } from '@angular/router';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { Expense } from '@core/domain-classes/expense';
import { ExpenseCategory } from '@core/domain-classes/expense-category';
import { ExpenseResourceParameter } from '@core/domain-classes/expense-source-parameter';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { User } from '@core/domain-classes/user';
import { ExpenseCategoryService } from '@core/services/expense-category.service';
import { ToastrService } from '@core/services/toastr.service';
import { merge, Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, tap } from 'rxjs/operators';
import { ExpenseService } from '../expense.service';
import { ExpenseDataSource } from './expense-datasource';
import { CommonService } from '@core/services/common.service';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { BaseComponent } from '../../base.component';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-expense-list',
  templateUrl: './expense-list.component.html',
  styleUrls: ['./expense-list.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    HasClaimDirective,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatMenuModule,
    RouterModule,
    MatSelectModule,
    MatIconModule,
    FormsModule,
    UTCToLocalTime,
    CustomCurrencyPipe,
    MatCardModule,
    MatButtonModule,
    NgClass
  ]
})
export class ExpenseListComponent extends BaseComponent implements OnInit {
  dataSource!: ExpenseDataSource;
  expenses: Expense[] = [];
  displayedColumns: string[] = [
    'action',
    'createdDate',
    'expenseDate',
    'amount',
    'reference',
    'expenseCategoryId',
    'expenseBy',
    'location',
    'taxes',
    'totalTax'];
  filteredColoumns: string[] = [
    'action-search',
    'date-search',
    'expensedate-search',
    'amount-search',
    'reference-search',
    'expenseCategoryId-search',
    'expenseBy-search',
    'taxes-search',
    'tax-search',
    'location-search'];
  footerToDisplayed = ['footer'];
  expenseResource: ExpenseResourceParameter;
  loading$!: Observable<boolean>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  _referenceFilter!: string;
  _categoryFilter!: string;
  _userFilter!: string;
  users: User[] = [];
  expenseCategories: ExpenseCategory[] = [];

  public filterObservable$: Subject<string> = new Subject<string>();

  public get ReferenceFilter(): string {
    return this._referenceFilter;
  }

  public set ReferenceFilter(v: string) {
    this._referenceFilter = v;
    const referenceFilter = `reference:${v}`;
    this.filterObservable$.next(referenceFilter);
  }

  public get CategoryFilter(): string {
    return this._categoryFilter;
  }

  public set CategoryFilter(v: string) {
    this._categoryFilter = v;
    const categoryFilter = `expenseCategoryId:${v}`;
    this.filterObservable$.next(categoryFilter);
  }

  public get UserFilter(): string {
    return this._userFilter;
  }

  public set UserFilter(v: string) {
    this._userFilter = v ? v : '';
    const expenseById = `expenseById:${this._userFilter}`;
    this.filterObservable$.next(expenseById);
  }

  constructor(
    private expenseService: ExpenseService,
    private toastrService: ToastrService,
    private commonDialogService: CommonDialogService,
    private router: Router,
    private expenseCategoryService: ExpenseCategoryService,
    private commonService: CommonService) {
    super();
    this.getLangDir();
    this.expenseResource = new ExpenseResourceParameter();
    this.expenseResource.pageSize = 15;
    this.expenseResource.orderBy = 'createdDate asc';
  }

  ngOnInit(): void {
    this.dataSource = new ExpenseDataSource(this.expenseService);
    this.dataSource.loadData(this.expenseResource);
    this.getResourceParameter();
    this.getExpenseCategories();
    this.getUsers();
    this.sub$.sink = this.filterObservable$
      .pipe(
        debounceTime(1000),
        distinctUntilChanged())
      .subscribe((c) => {
        this.expenseResource.skip = 0;
        this.paginator.pageIndex = 0;
        const strArray: Array<string> = c.split(':');
        if (strArray[0] === 'reference') {
          this.expenseResource.reference = strArray[1];
        } else if (strArray[0] === 'expenseCategoryId') {
          this.expenseResource.expenseCategoryId = strArray[1];
        } else if (strArray[0] === 'expenseById') {
          this.expenseResource.expenseById = strArray[1];
        }
        this.dataSource.loadData(this.expenseResource);
      });

    this.sub$.sink = this.dataSource.connect().subscribe((data: Expense[]) => {
      this.expenses = data;
    });
  }

  ngAfterViewInit() {
    this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);
    this.sub$.sink = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        tap((c: any) => {
          this.expenseResource.skip = this.paginator.pageIndex * this.paginator.pageSize;
          this.expenseResource.pageSize = this.paginator.pageSize;
          this.expenseResource.orderBy = this.sort.active + ' ' + this.sort.direction;
          this.dataSource.loadData(this.expenseResource);
        })
      )
      .subscribe();
  }

  getExpenseCategories() {
    this.expenseCategoryService.getAll().subscribe(categories => {
      this.expenseCategories = categories;
    })
  }

  getUsers() {
    this.sub$.sink = this.commonService.getAllUsers()
      .subscribe((users: User[]) => {
        this.users = users;
      });
  }

  deleteExpense(expense: Expense) {
    this.sub$.sink = this.commonDialogService
      .deleteConformationDialog(`${this.translationService.getValue('ARE_YOU_SURE_YOU_WANT_TO_DELETE')}?`)
      .subscribe((isTrue: boolean) => {
        if (isTrue) {
          this.sub$.sink = this.expenseService.deleteExpense(expense.id)
            .subscribe(() => {
              this.toastrService.success(this.translationService.getValue('EXPENSE_DELETED_SUCCESSFULLY'));
              this.dataSource.loadData(this.expenseResource);
            });
        }
      });
  }

  getResourceParameter() {
    this.sub$.sink = this.dataSource.responseHeaderSubject$
      .subscribe((c: ResponseHeader) => {
        if (c) {
          this.expenseResource.pageSize = c.pageSize;
          this.expenseResource.skip = c.skip;
          this.expenseResource.totalCount = c.totalCount;
        }
      });
  }

  editExpense(expenseId: string) {
    this.router.navigate(['/expense/manage', expenseId])
  }

  downloadReceipt(expense: Expense) {
    this.sub$.sink = this.expenseService.downloadReceipt(expense.id)
      .subscribe(
        (event) => {
          if (event.type === HttpEventType.Response) {
            this.downloadFile(event, expense.receiptName);
          }
        },
      );
  }

  private downloadFile(data: HttpResponse<Blob>, name: string) {
    const downloadedFile = new Blob([data.body ?? ''], { type: data.body?.type });
    const a = document.createElement('a');
    a.setAttribute('style', 'display:none;');
    document.body.appendChild(a);
    a.download = name;
    a.href = URL.createObjectURL(downloadedFile);
    a.target = '_blank';
    a.click();
    document.body.removeChild(a);
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.expenses.indexOf(row);
  }
}
