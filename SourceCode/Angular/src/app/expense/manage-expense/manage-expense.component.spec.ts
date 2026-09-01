import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpResponse, provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Subject, of } from 'rxjs';

import { ManageExpenseComponent } from './manage-expense.component';
import { ExpenseService } from '../expense.service';
import { ExpenseCategoryService } from '@core/services/expense-category.service';
import { CommonService } from '@core/services/common.service';
import { TaxService } from '@core/services/tax.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { Expense } from '@core/domain-classes/expense';

describe('ManageExpenseComponent', () => {
  let component: ManageExpenseComponent;
  let fixture: ComponentFixture<ManageExpenseComponent>;
  let expenseService: jasmine.SpyObj<ExpenseService>;
  let expenseCategoryService: jasmine.SpyObj<ExpenseCategoryService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let taxService: jasmine.SpyObj<TaxService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let router: Router;
  let routeData: Subject<any>;

  const expense = {
    id: 'e1',
    reference: 'REF-1',
    amount: 100,
    expenseCategoryId: 'c1',
    expenseById: 'u1',
    locationId: 'l1',
    expenseDate: new Date('2026-01-15T00:00:00Z'),
    expenseTaxes: [{ taxId: 't1' } as any],
  } as unknown as Expense;

  beforeEach(async () => {
    expenseService = jasmine.createSpyObj<ExpenseService>('ExpenseService', ['addExpense', 'updateExpense', 'downloadReceipt']);
    expenseCategoryService = jasmine.createSpyObj<ExpenseCategoryService>('ExpenseCategoryService', ['getAll']);
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getAllUsers', 'getLocationsForCurrentUser']);
    taxService = jasmine.createSpyObj<TaxService>('TaxService', ['getAll']);
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open', 'closeAll']);
    routeData = new Subject<any>();

    await TestBed.configureTestingModule({
      imports: [ManageExpenseComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideNativeDateAdapter(),
        CurrencyPipe,
        { provide: ExpenseService, useValue: expenseService },
        { provide: ExpenseCategoryService, useValue: expenseCategoryService },
        { provide: CommonService, useValue: commonService },
        { provide: TaxService, useValue: taxService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialog, useValue: dialog },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => null, has: () => false }, queryParamMap: { get: () => null }, routeConfig: { path: 'manage' } },
            data: routeData.asObservable(),
            params: new Subject<any>().asObservable(),
            queryParams: new Subject<any>().asObservable(),
            paramMap: new Subject<any>().asObservable(),
            queryParamMap: new Subject<any>().asObservable(),
            url: new Subject<any>().asObservable(),
          },
        },
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
    commonService.getAllUsers.and.returnValue(of([{ id: 'u1', firstName: 'Ali', lastName: 'Khan' } as any]));
    taxService.getAll.and.returnValue(of([{ id: 't1', name: 'GST', percentage: 10 } as any]));
    commonService.getLocationsForCurrentUser.and.returnValue(of({ locations: [{ id: 'l1', name: 'Main' } as any], selectedLocation: 'l1' }));
    fixture = TestBed.createComponent(ManageExpenseComponent);
    component = fixture.componentInstance;
    dialog = (component as any).dialog;
    spyOn(dialog, 'open').and.returnValue({ afterClosed: () => of(undefined) } as any);
    fixture.detectChanges();
  }

  it('should create with default form and lookup data loaded', () => {
    create();
    expect(component).toBeTruthy();
    expect(component.expenseForm).toBeTruthy();
    expect(component.expenseForm.get('expenseDate')?.value).toEqual(jasmine.any(Date));
    expect(component.expenseForm.get('locationId')?.value).toBe('l1');
    expect(component.expenseCategories.length).toBe(1);
    expect(component.taxes.length).toBe(1);
    expect(component.users.length).toBe(1);
  });

  it('route data expense patches form, disables location and preselects taxes', () => {
    create();
    routeData.next({ expense });
    fixture.detectChanges();
    expect(component.expenseForm.get('id')?.value).toBe('e1');
    expect(component.expenseForm.get('amount')?.value).toBe(100);
    expect(component.expenseForm.get('expenseCategoryId')?.value).toBe('c1');
    expect(component.expenseForm.get('expenseTaxIds')?.value).toEqual(['t1']);
    expect(component.expenseForm.get('locationId')?.disabled).toBe(true);
  });

  it('invalid submit marks controls touched and calls no api', () => {
    create();
    component.onExpenseSubmit();
    expect(expenseService.addExpense).not.toHaveBeenCalled();
    expect(expenseService.updateExpense).not.toHaveBeenCalled();
    expect(component.expenseForm.get('expenseCategoryId')?.touched).toBe(true);
  });

  it('valid new expense computes taxes and posts via addExpense', fakeAsync(() => {
    create();
    expenseService.addExpense.and.returnValue(of({ id: 'new' } as Expense));
    component.expenseForm.patchValue({ expenseCategoryId: 'c1', amount: 100, locationId: 'l1', expenseTaxIds: ['t1'] });
    component.onExpenseSubmit();
    tick(0);
    expect(expenseService.addExpense).toHaveBeenCalledTimes(1);
    const sent = expenseService.addExpense.calls.mostRecent().args[0] as any;
    expect(sent.expenseTaxes.length).toBe(1);
    expect(sent.expenseTaxes[0]).toEqual(jasmine.objectContaining({ taxId: 't1', taxValue: 10 }));
    expect(sent.totalTax).toBe(10);
    expect(expenseService.updateExpense).not.toHaveBeenCalled();
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
    expect(router.navigate).toHaveBeenCalledWith(['expense']);
  }));

  it('valid existing expense updates via updateExpense with id', fakeAsync(() => {
    create();
    expenseService.updateExpense.and.returnValue(of({ ...expense }));
    routeData.next({ expense });
    fixture.detectChanges();
    component.expenseForm.patchValue({ amount: 200 });
    component.onExpenseSubmit();
    tick(0);
    expect(expenseService.updateExpense).toHaveBeenCalledWith('e1', jasmine.objectContaining({ amount: 200 }));
    expect(expenseService.addExpense).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['expense']);
  }));

  it('removeReceipt clears receipt fields and flags change', () => {
    create();
    component.expenseForm.patchValue({ receiptName: 'old.pdf', documentData: 'data' });
    component.removeReceipt();
    expect(component.expenseForm.get('isReceiptChange')?.value).toBe(true);
    expect(component.expenseForm.get('receiptName')?.value).toBe('');
    expect(component.expenseForm.get('documentData')?.value).toBe('');
    expect(component.ReceiptName).toBe('');
  });

  it('fileEvent reads selected file into form', async () => {
    create();
    class FakeFileReader {
      onload: any;
      result: string | null = null;
      readAsDataURL(_file: File): void {
        this.result = 'data:image/png;base64,xxx';
        Promise.resolve().then(() => this.onload && this.onload({} as Event));
      }
    }
    spyOn(window, 'FileReader').and.returnValue(new FakeFileReader() as unknown as FileReader);
    const file = new File(['x'], 'rec.png', { type: 'image/png' });
    component.fileEvent({ target: { files: [file] } });
    await Promise.resolve();
    expect(component.expenseForm.get('receiptName')?.value).toBe('rec.png');
    expect(component.expenseForm.get('isReceiptChange')?.value).toBe(true);
    expect(component.expenseForm.get('documentData')?.value).toContain('data:image/png');
  });

  it('fileEvent with no files leaves form untouched', () => {
    create();
    component.expenseForm.patchValue({ receiptName: 'keep.pdf' });
    component.fileEvent({ target: { files: [] } });
    expect(component.expenseForm.get('receiptName')?.value).toBe('keep.pdf');
    expect(component.isReceiptDeleted).toBe(true);
  });

  it('addExpenseCategory dialog result appends category and selects it', () => {
    create();
    (dialog.open as jasmine.Spy).and.returnValue({ afterClosed: () => of({ id: 'c9', name: 'New Cat' }) } as any);
    component.addExpenseCategory();
    expect(dialog.open).toHaveBeenCalled();
    expect(component.expenseCategories.map((c) => c.id)).toContain('c9');
    expect(component.expenseForm.get('expenseCategoryId')?.value).toBe('c9');
  });

  it('addExpenseCategory dialog dismissed adds nothing', () => {
    create();
    component.addExpenseCategory();
    expect(component.expenseCategories.length).toBe(1);
    expect(component.expenseForm.get('expenseCategoryId')?.value).not.toBe('c9');
  });

  it('downloadReceipt without id does not call service', () => {
    create();
    component.downloadReceipt();
    expect(expenseService.downloadReceipt).not.toHaveBeenCalled();
  });

  it('downloadReceipt with id requests receipt download', fakeAsync(() => {
    create();
    routeData.next({ expense });
    fixture.detectChanges();
    expenseService.downloadReceipt.and.returnValue(of(new HttpResponse({ body: new Blob(['pdf']) })));
    component.downloadReceipt();
    tick(0);
    expect(expenseService.downloadReceipt).toHaveBeenCalledWith('e1');
  }));
});
