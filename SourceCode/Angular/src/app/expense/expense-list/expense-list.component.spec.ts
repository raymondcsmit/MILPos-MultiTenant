import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { BehaviorSubject, of } from 'rxjs';

import { ExpenseListComponent } from './expense-list.component';
import { ExpenseService } from '../expense.service';
import { ExpenseCategoryService } from '@core/services/expense-category.service';
import { CommonService } from '@core/services/common.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { SecurityService } from '@core/security/security.service';
import { Expense } from '@core/domain-classes/expense';

describe('ExpenseListComponent', () => {
  let component: ExpenseListComponent;
  let fixture: ComponentFixture<ExpenseListComponent>;
  let expenseService: jasmine.SpyObj<ExpenseService>;
  let expenseCategoryService: jasmine.SpyObj<ExpenseCategoryService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let router: Router;

  const expenses: Expense[] = [
    { id: 'e1', reference: 'REF-1', amount: 100, expenseCategory: 'Rent', expenseBy: 'Ali', locationName: 'Main' } as unknown as Expense,
    { id: 'e2', reference: 'REF-2', amount: 250, expenseCategory: 'Fuel', expenseBy: 'Bo', locationName: 'Branch' } as unknown as Expense,
  ];

  function paginated<T>(body: T[], header: Record<string, number> = {}): HttpResponse<T[]> {
    return new HttpResponse({
      body,
      headers: new HttpHeaders({
        'X-Pagination': JSON.stringify({ totalCount: body.length, pageSize: 15, skip: 0, ...header }),
      }),
    });
  }

  beforeEach(async () => {
    expenseService = jasmine.createSpyObj<ExpenseService>('ExpenseService', ['getExpenses', 'deleteExpense', 'downloadReceipt']);
    expenseCategoryService = jasmine.createSpyObj<ExpenseCategoryService>('ExpenseCategoryService', ['getAll']);
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getAllUsers']);
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    commonDialogService = jasmine.createSpyObj<CommonDialogService>('CommonDialogService', ['deleteConformationDialog']);

    await TestBed.configureTestingModule({
      imports: [ExpenseListComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideNativeDateAdapter(),
        CurrencyPipe,
        { provide: ExpenseService, useValue: expenseService },
        { provide: ExpenseCategoryService, useValue: expenseCategoryService },
        { provide: CommonService, useValue: commonService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: CommonDialogService, useValue: commonDialogService },
        {
          provide: SecurityService,
          useValue: Object.assign(jasmine.createSpyObj('SecurityService', ['hasClaim']), { currencyCode: 'USD' }),
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  function create(): void {
    expenseCategoryService.getAll.and.returnValue(of([{ id: 'c1', name: 'Rent' } as any]));
    commonService.getAllUsers.and.returnValue(of([{ id: 'u1', firstName: 'Ali' } as any]));
    fixture = TestBed.createComponent(ExpenseListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and load expenses, categories and users on init', () => {
    expenseService.getExpenses.and.returnValue(of(paginated(expenses, { totalCount: 42 })));
    expenseCategoryService.getAll.and.returnValue(of([{ id: 'c1', name: 'Rent' } as any]));
    commonService.getAllUsers.and.returnValue(of([{ id: 'u1', firstName: 'Ali', lastName: 'Khan' } as any]));
    create();
    expect(component).toBeTruthy();
    expect(expenseService.getExpenses).toHaveBeenCalledOnceWith(jasmine.objectContaining({ pageSize: 15, skip: 0, orderBy: 'createdDate asc' }));
    expect(component.expenses.length).toBe(2);
    expect(component.expenseCategories.length).toBe(1);
    expect(component.users.length).toBe(1);
    expect(component.expenseResource.totalCount).toBe(42);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('REF-1');
    expect(text).toContain('REF-2');
  });

  it('renders empty state row when no expenses returned', () => {
    expenseService.getExpenses.and.returnValue(of(paginated([])));
    create();
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(component.expenses.length).toBe(0);
    expect(text).toContain('NO_DATA_FOUND');
  });

  it('reference filter reloads with reference and reset skip', fakeAsync(() => {
    expenseService.getExpenses.and.returnValues(of(paginated(expenses)), of(paginated(expenses)));
    create();
    tick(0);
    component.ReferenceFilter = 'REF-2';
    tick(1000);
    const args = expenseService.getExpenses.calls.mostRecent().args[0];
    expect(args.reference).toBe('REF-2');
    expect(args.skip).toBe(0);
    expect(component.paginator.pageIndex).toBe(0);
  }));

  it('category filter reloads with expenseCategoryId', fakeAsync(() => {
    expenseService.getExpenses.and.returnValues(of(paginated(expenses)), of(paginated(expenses)));
    create();
    tick(0);
    component.CategoryFilter = 'c1';
    tick(1000);
    const args = expenseService.getExpenses.calls.mostRecent().args[0];
    expect(args.expenseCategoryId).toBe('c1');
  }));

  it('user filter reloads with expenseById', fakeAsync(() => {
    expenseService.getExpenses.and.returnValues(of(paginated(expenses)), of(paginated(expenses)));
    create();
    tick(0);
    component.UserFilter = 'u1';
    tick(1000);
    const args = expenseService.getExpenses.calls.mostRecent().args[0];
    expect(args.expenseById).toBe('u1');
  }));

  it('sort change reloads with sort order and resets page index', fakeAsync(() => {
    expenseService.getExpenses.and.returnValues(of(paginated(expenses)), of(paginated(expenses)));
    create();
    tick(0);
    component.paginator.pageIndex = 2;
    component.sort.active = 'amount';
    component.sort.direction = 'desc';
    component.sort.sortChange.emit({ active: 'amount', direction: 'desc' } as Sort);
    tick(0);
    const args = expenseService.getExpenses.calls.mostRecent().args[0];
    expect(args.orderBy).toBe('amount desc');
    expect(component.paginator.pageIndex).toBe(0);
  }));

  it('paginator page reloads with computed skip and page size', fakeAsync(() => {
    let observed: any = null;
    expenseService.getExpenses.and.callFake((r: any) => {
      observed = { skip: r.skip, pageSize: r.pageSize };
      return of(paginated(expenses));
    });
    create();
    tick(0);
    component.paginator.pageIndex = 1;
    component.paginator.pageSize = 20;
    component.paginator.page.emit({ pageIndex: 1, pageSize: 20, length: 42 } as PageEvent);
    tick(0);
    expect(observed).toEqual({ skip: 20, pageSize: 20 });
  }));

  it('delete confirmed removes expense and reloads list', fakeAsync(() => {
    expenseService.getExpenses.and.returnValue(of(paginated(expenses)));
    expenseService.deleteExpense.and.returnValue(of(void 0));
    create();
    tick(0);
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    component.deleteExpense(expenses[0]);
    tick(0);
    expect(commonDialogService.deleteConformationDialog).toHaveBeenCalledWith(jasmine.stringContaining('?'));
    expect(expenseService.deleteExpense).toHaveBeenCalledWith('e1');
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
    expect(expenseService.getExpenses.calls.count()).toBe(2);
  }));

  it('declined delete confirmation does not call delete api', fakeAsync(() => {
    expenseService.getExpenses.and.returnValue(of(paginated(expenses)));
    create();
    tick(0);
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    component.deleteExpense(expenses[0]);
    tick(0);
    expect(expenseService.deleteExpense).not.toHaveBeenCalled();
    expect(expenseService.getExpenses.calls.count()).toBe(1);
  }));

  it('editExpense navigates to manage route with id', () => {
    expenseService.getExpenses.and.returnValue(of(paginated(expenses)));
    create();
    component.editExpense('e1');
    expect(router.navigate).toHaveBeenCalledWith(['/expense/manage', 'e1']);
  });

  it('downloadReceipt downloads receipt response event', fakeAsync(() => {
    expenseService.getExpenses.and.returnValue(of(paginated([{ ...expenses[0], receiptName: 'rec.pdf' }])));
    create();
    tick(0);
    expenseService.downloadReceipt.and.returnValue(of(new HttpResponse({ body: new Blob(['pdf']) })));
    component.downloadReceipt({ ...expenses[0], receiptName: 'rec.pdf' });
    tick(0);
    expect(expenseService.downloadReceipt).toHaveBeenCalledWith('e1');
  }));
});
