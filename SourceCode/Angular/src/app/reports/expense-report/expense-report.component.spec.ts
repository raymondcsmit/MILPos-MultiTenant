import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { BehaviorSubject, of } from 'rxjs';

import { ExpenseReportComponent } from './expense-report.component';
import { ExpenseService } from '../../expense/expense.service';
import { ExpenseCategoryService } from '@core/services/expense-category.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { Expense } from '@core/domain-classes/expense';
import { ExpenseCategory } from '@core/domain-classes/expense-category';
import { User } from '@core/domain-classes/user';

describe('ExpenseReportComponent', () => {
  let component: ExpenseReportComponent;
  let fixture: ComponentFixture<ExpenseReportComponent>;
  let expenseService: jasmine.SpyObj<ExpenseService>;
  let expenseCategoryService: jasmine.SpyObj<ExpenseCategoryService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;

  const expenses: Expense[] = [
    {
      id: 'e1',
      createdDate: new Date('2026-01-05T00:00:00Z'),
      expenseDate: new Date('2026-01-05T00:00:00Z'),
      amount: 100,
      totalTax: 5,
      totalAmount: 105,
      reference: 'REF-1',
      expenseCategory: 'Rent',
      expenseBy: 'admin',
    } as unknown as Expense,
    {
      id: 'e2',
      createdDate: new Date('2026-01-06T00:00:00Z'),
      expenseDate: new Date('2026-01-06T00:00:00Z'),
      amount: 50,
      totalTax: 0,
      totalAmount: 50,
      reference: 'REF-2',
      expenseCategory: 'Utilities',
      expenseBy: 'manager',
    } as unknown as Expense,
  ];

  function paginated(body: Expense[]): HttpResponse<Expense[]> {
    return new HttpResponse({
      body,
      headers: new HttpHeaders({
        'X-Pagination': JSON.stringify({ totalCount: body.length, pageSize: 15, skip: 0, totalAmount: 155 }),
      }),
    });
  }

  beforeEach(() => {
    expenseService = jasmine.createSpyObj<ExpenseService>('ExpenseService', ['getExpenses', 'getExpensesReport']);
    expenseCategoryService = jasmine.createSpyObj<ExpenseCategoryService>('ExpenseCategoryService', ['getAll']);
    expenseCategoryService.getAll.and.returnValue(of([{ id: 'c1', name: 'Rent' } as ExpenseCategory]));
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getLocationsForReport', 'getAllUsers']);
    commonService.getLocationsForReport.and.returnValue(of({ locations: [{ id: 'loc1', name: 'Main' } as any], selectedLocation: 'loc1' } as any));
    commonService.getAllUsers.and.returnValue(of([{ id: 'u1', username: 'admin' } as unknown as User]));
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    const securityService = jasmine.createSpyObj('SecurityService', ['hasClaim']);
    (securityService as any).currencyCode = 'USD';
    securityService.hasClaim.and.returnValue(true);

    TestBed.configureTestingModule({
      imports: [ExpenseReportComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideNativeDateAdapter(),
        CurrencyPipe,
        { provide: ExpenseService, useValue: expenseService },
        { provide: ExpenseCategoryService, useValue: expenseCategoryService },
        { provide: CommonService, useValue: commonService },
        { provide: SecurityService, useValue: securityService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialog, useValue: dialog },
      ],
    });
  });

  function create(): void {
    expenseService.getExpenses.and.returnValue(of(paginated(expenses)));
    fixture = TestBed.createComponent(ExpenseReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create, load categories, users and expenses for the selected location', fakeAsync(() => {
    create();
    expect(component).toBeTruthy();
    expect(expenseCategoryService.getAll).toHaveBeenCalled();
    expect(commonService.getAllUsers).toHaveBeenCalled();
    expect(expenseService.getExpenses).toHaveBeenCalledWith(
      jasmine.objectContaining({ locationId: 'loc1', pageSize: 15, skip: 0, orderBy: 'createdDate asc' })
    );
    expect(component.expenses.length).toBe(2);
    expect(component.expenseCategories.length).toBe(1);
    expect(component.users.length).toBe(1);
    expect(component.totalAmount).toBe(155);
    expect(component.searchForm.get('locationId')?.value).toBe('loc1');
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('REF-1');
    expect(text).toContain('REF-2');
  }));

  it('reference, category and user filters debounce into the resource with reset skip', fakeAsync(() => {
    create();
    expenseService.getExpenses.calls.reset();
    component.ReferenceFilter = 'REF-9';
    tick(1000);
    let args = expenseService.getExpenses.calls.mostRecent().args[0];
    expect(args.reference).toBe('REF-9');
    expect(args.skip).toBe(0);
    expect(component.paginator.pageIndex).toBe(0);

    component.CategoryFilter = 'c1';
    tick(1000);
    args = expenseService.getExpenses.calls.mostRecent().args[0];
    expect(args.expenseCategoryId).toBe('c1');

    component.UserFilter = 'u1';
    tick(1000);
    args = expenseService.getExpenses.calls.mostRecent().args[0];
    expect(args.expenseById).toBe('u1');
  }));

  it('onSearch copies form filters and skips reload when date range is invalid', fakeAsync(() => {
    create();
    expenseService.getExpenses.calls.reset();
    component.searchForm.patchValue({
      fromDate: new Date(2026, 0, 1),
      toDate: new Date(2026, 0, 31),
      locationId: 'loc2',
    });
    component.onSearch();
    const args = expenseService.getExpenses.calls.mostRecent().args[0];
    expect(args.locationId).toBe('loc2');
    expect(args.fromDate).toEqual(new Date(2026, 0, 1));

    expenseService.getExpenses.calls.reset();
    component.searchForm.patchValue({ fromDate: new Date(2026, 1, 1), toDate: new Date(2026, 0, 1) });
    expect(component.searchForm.valid).toBeFalse();
    component.onSearch();
    expect(expenseService.getExpenses).not.toHaveBeenCalled();
  }));

  it('onClear resets the form and reloads with the first location', fakeAsync(() => {
    create();
    component.searchForm.patchValue({ locationId: 'loc2' });
    component.onSearch();
    component.onClear();
    const args = expenseService.getExpenses.calls.mostRecent().args[0];
    expect(args.locationId).toBe('loc1');
  }));

  it('sort and page handlers recompute orderBy and skip', fakeAsync(() => {
    create();
    expenseService.getExpenses.and.returnValue(of(new HttpResponse({ body: expenses })));
    expenseService.getExpenses.calls.reset();
    component.sort.active = 'amount';
    component.sort.direction = 'desc';
    component.sort.sortChange.emit({ active: 'amount', direction: 'desc' } as Sort);
    let args = expenseService.getExpenses.calls.mostRecent().args[0];
    expect(args.orderBy).toBe('amount desc');
    expect(args.skip).toBe(0);

    component.paginator.pageIndex = 1;
    component.paginator.pageSize = 15;
    component.paginator.page.emit({ pageIndex: 1, pageSize: 15, length: 30 } as PageEvent);
    args = expenseService.getExpenses.calls.mostRecent().args[0];
    expect(args.skip).toBe(15);
    expect(args.pageSize).toBe(15);
  }));

  it('onDownloadReport reports no data when the loaded report is empty', fakeAsync(() => {
    create();
    component.expenseResource.totalCount = 0;
    expenseService.getExpensesReport.calls.reset();
    component.onDownloadReport('pdf');
    expect(toastrService.error).toHaveBeenCalledWith('TRANSLATED');
    expect(expenseService.getExpensesReport).not.toHaveBeenCalled();
  }));

  it('onDownloadReport email path fetches all expenses and opens the send-email dialog', fakeAsync(() => {
    create();
    expenseService.getExpensesReport.and.returnValue(of(paginated(expenses)));
    dialog.open.and.returnValue({ afterClosed: () => of(void 0) } as any);
    component.onDownloadReport('email');
    expect(expenseService.getExpensesReport).toHaveBeenCalledWith(component.expenseResource);
    expect(dialog.open).toHaveBeenCalledWith(
      jasmine.anything(),
      jasmine.objectContaining({
        data: jasmine.objectContaining({ name: 'TRANSLATED.pdf', contentType: 'application/pdf' }),
      })
    );
  }));
});
