import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpHeaders, HttpResponse, provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { BehaviorSubject, of } from 'rxjs';

import { ExpenseTaxReportComponent } from './expense-tax-report.component';
import { ExpenseService } from '../../../expense/expense.service';
import { ExpenseCategoryService } from '@core/services/expense-category.service';
import { CommonService } from '@core/services/common.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { Expense } from '@core/domain-classes/expense';

describe('ExpenseTaxReportComponent', () => {
  let component: ExpenseTaxReportComponent;
  let fixture: ComponentFixture<ExpenseTaxReportComponent>;
  let expenseService: jasmine.SpyObj<ExpenseService>;
  let expenseCategoryService: jasmine.SpyObj<ExpenseCategoryService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialog: any;

  const expenses: Expense[] = [
    { id: 'ex-1', expenseDate: '2026-01-01T00:00:00Z', reference: 'EXP-1', amount: 100, totalTax: 17, expenseCategory: 'Rent', expenseBy: 'admin' } as unknown as Expense,
    { id: 'ex-2', expenseDate: '2026-01-02T00:00:00Z', reference: 'EXP-2', amount: 200, totalTax: 34, expenseCategory: 'Fuel', expenseBy: 'admin' } as unknown as Expense,
  ];

  function paginated<T>(body: T[], header: Record<string, number> = {}): HttpResponse<T[]> {
    return new HttpResponse({
      body,
      headers: new HttpHeaders({
        'X-Pagination': JSON.stringify({ totalCount: body.length, pageSize: 15, skip: 0, ...header }),
      }),
    });
  }

  beforeEach(() => {
    expenseService = jasmine.createSpyObj<ExpenseService>('ExpenseService', ['getExpenses', 'getExpensesReport', 'getTotalByTaxForExpense']);
    expenseCategoryService = jasmine.createSpyObj<ExpenseCategoryService>('ExpenseCategoryService', ['getAll']);
    expenseCategoryService.getAll.and.returnValue(of([{ id: 'cat1', name: 'Rent' } as any]));
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getLocationsForReport', 'getAllUsers']);
    commonService.getLocationsForReport.and.returnValue(of({ locations: [{ id: 'loc1', name: 'Main' } as any], selectedLocation: 'loc1' } as any));
    commonService.getAllUsers.and.returnValue(of([{ id: 'u1', userName: 'admin' } as any]));
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();

    TestBed.configureTestingModule({
      imports: [ExpenseTaxReportComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideNativeDateAdapter(),
        CurrencyPipe,
        { provide: JwtHelperService, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: ExpenseService, useValue: expenseService },
        { provide: ExpenseCategoryService, useValue: expenseCategoryService },
        { provide: CommonService, useValue: commonService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialog, useValue: dialog },
      ],
    });
  });

  function create(): void {
    expenseService.getExpenses.and.returnValue(of(paginated(expenses)));
    expenseService.getExpensesReport.and.returnValue(of(paginated(expenses)));
    expenseService.getTotalByTaxForExpense.and.returnValue(of([{ taxId: 't1', taxName: 'GST 17%', taxValue: 51 }] as any[]));
    fixture = TestBed.createComponent(ExpenseTaxReportComponent);
    component = fixture.componentInstance;
    // the component imports MatDialogModule, whose injector shadows the TestBed
    // MatDialog provider — spy on the instance the component actually holds
    dialog = (component as any).dialog;
    spyOn(dialog, 'open');
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }

  it('should create, load categories, users, rows and tax totals for selected location', fakeAsync(() => {
    create();
    expect(component).toBeTruthy();
    expect(component.expenseResource.pageSize).toBe(15);
    expect(component.expenseResource.orderBy).toBe('createdDate asc');
    expect(component.expenseResource.locationId).toBe('loc1');
    expect(expenseCategoryService.getAll).toHaveBeenCalled();
    expect(component.users.length).toBe(1);
    expect(component.expenseCategories.length).toBe(1);
    expect(expenseService.getExpenses).toHaveBeenCalledWith(jasmine.objectContaining({ locationId: 'loc1', pageSize: 15 }));
    expect(component.expenses.length).toBe(2);
    expect(component.totalsByTax.length).toBe(1);
    expect(component.grandTotalTaxAmount).toBe(51);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('EXP-1');
  }));

  it('onSearch copies form filters into resource and reloads rows plus tax totals', fakeAsync(() => {
    create();
    expenseService.getExpenses.calls.reset();
    component.searchForm.patchValue({ locationId: 'loc2', fromDate: new Date(2026, 0, 1), toDate: new Date(2026, 0, 31) });
    component.onSearch();
    const args = expenseService.getExpenses.calls.mostRecent().args[0];
    expect(args.locationId).toBe('loc2');
    expect(args.fromDate).toEqual(new Date(2026, 0, 1));
    expect(args.toDate).toEqual(new Date(2026, 0, 31));
    expect(expenseService.getTotalByTaxForExpense).toHaveBeenCalled();
  }));

  it('reference filter setter debounces reload with skip reset', fakeAsync(() => {
    create();
    expenseService.getExpenses.calls.reset();
    component.ReferenceFilter = 'EXP-9';
    tick(1100);
    expect(component.paginator.pageIndex).toBe(0);
    expect(expenseService.getExpenses).toHaveBeenCalledWith(jasmine.objectContaining({ reference: 'EXP-9', skip: 0 }));
  }));

  it('category and user filter setters route values into resource', fakeAsync(() => {
    create();
    expenseService.getExpenses.calls.reset();
    component.CategoryFilter = 'cat1';
    tick(1100);
    expect(expenseService.getExpenses).toHaveBeenCalledWith(jasmine.objectContaining({ expenseCategoryId: 'cat1' }));
    expenseService.getExpenses.calls.reset();
    component.UserFilter = 'u1';
    tick(1100);
    expect(expenseService.getExpenses).toHaveBeenCalledWith(jasmine.objectContaining({ expenseById: 'u1' }));
  }));

  it('paginator page computes skip from pageIndex and pageSize', fakeAsync(() => {
    // capture at call time: the response header sync overwrites the shared resource object
    let captured: any = null;
    create();
    expenseService.getExpenses.and.callFake((r: any) => {
      captured = { skip: r.skip, pageSize: r.pageSize };
      return of(paginated(expenses));
    });
    component.paginator.pageIndex = 1;
    component.paginator.pageSize = 10;
    component.paginator.page.emit({ pageIndex: 1, pageSize: 10, length: 22 } as PageEvent);
    expect(captured.skip).toBe(10);
    expect(captured.pageSize).toBe(10);
  }));

  it('toggleRow expands and collapses row', fakeAsync(() => {
    create();
    component.toggleRow(expenses[0]);
    expect(component.expandedElement).toBe(expenses[0]);
    component.toggleRow(expenses[0]);
    expect(component.expandedElement).toBeNull();
  }));

  it('onDownloadReport reports error when totalCount is zero', fakeAsync(() => {
    create();
    component.expenseResource.totalCount = 0;
    component.onDownloadReport('pdf');
    expect(toastrService.error).toHaveBeenCalledWith('TRANSLATED');
    expect(expenseService.getExpensesReport).not.toHaveBeenCalled();
  }));

  it('onDownloadReport email path uses report endpoint and opens send-email dialog', fakeAsync(() => {
    create();
    dialog.open.and.returnValue({ afterClosed: () => of(void 0) } as any);
    component.onDownloadReport('email');
    expect(expenseService.getExpensesReport).toHaveBeenCalledWith(jasmine.objectContaining({ locationId: 'loc1' }));
    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({
      data: jasmine.objectContaining({ name: 'TRANSLATED.pdf', contentType: 'application/pdf' }),
    }));
  }));
});
