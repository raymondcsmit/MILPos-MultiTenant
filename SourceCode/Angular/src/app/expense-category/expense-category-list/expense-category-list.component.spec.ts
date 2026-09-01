import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { ExpenseCategoryListComponent } from './expense-category-list.component';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { ExpenseCategory } from '@core/domain-classes/expense-category';

describe('ExpenseCategoryListComponent', () => {
  let component: ExpenseCategoryListComponent;
  let fixture: ComponentFixture<ExpenseCategoryListComponent>;
  let httpMock: HttpTestingController;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  const categories: ExpenseCategory[] = [
    { id: 'ec1', name: 'Travel' } as ExpenseCategory,
    { id: 'ec2', name: 'Meals' } as ExpenseCategory,
  ];

  beforeEach(() => {
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    commonDialogService = jasmine.createSpyObj<CommonDialogService>('CommonDialogService', ['deleteConformationDialog']);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);

    TestBed.configureTestingModule({
      imports: [ExpenseCategoryListComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: CommonDialogService, useValue: commonDialogService },
        { provide: MatDialog, useValue: dialog },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function load(): void {
    fixture = TestBed.createComponent(ExpenseCategoryListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne(r => r.method === 'GET' && r.url === 'ExpenseCategories').flush(categories);
    fixture.detectChanges();
  }

  it('should create and load expense categories on init', () => {
    load();
    expect(component).toBeTruthy();
    expect(component.expenseCategories.length).toBe(2);
    expect(fixture.nativeElement.querySelector('table')?.textContent).toContain('Travel');
    expect(fixture.nativeElement.querySelector('table')?.textContent).toContain('Meals');
  });

  it('delete confirmation removes category from list', () => {
    load();
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    component.deleteExpenseCategory(categories[0]);
    expect(commonDialogService.deleteConformationDialog).toHaveBeenCalledWith(jasmine.stringContaining('Travel'));
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === 'ExpenseCategory/ec1').flush(null);
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
    expect(component.expenseCategories.map(c => c.id)).toEqual(['ec2']);
  });

  it('declined delete confirmation does not call api', () => {
    load();
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    component.deleteExpenseCategory(categories[0]);
    httpMock.expectNone(r => r.method === 'DELETE');
    expect(component.expenseCategories.length).toBe(2);
  });

  it('closed dialog result replaces existing category', () => {
    load();
    const updated = { id: 'ec2', name: 'Meals & Entertainment' } as ExpenseCategory;
    dialog.open.and.returnValue({ afterClosed: () => of(updated) } as any);
    component.manageExpenseCategory(categories[1]);
    expect(component.expenseCategories[1].name).toBe('Meals & Entertainment');
    expect(component.expenseCategories.length).toBe(2);
  });

  it('closed dialog result appends new category', () => {
    load();
    const created = { id: 'ec3', name: 'Utilities' } as ExpenseCategory;
    dialog.open.and.returnValue({ afterClosed: () => of(created) } as any);
    component.manageExpenseCategory(null);
    expect(component.expenseCategories.length).toBe(3);
    expect(component.expenseCategories[2].name).toBe('Utilities');
  });

  it('dialog closed without result leaves list unchanged', () => {
    load();
    dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as any);
    component.manageExpenseCategory(null);
    expect(component.expenseCategories.length).toBe(2);
  });
});
