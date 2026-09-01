import { ComponentFixture, TestBed, fakeAsync } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { ExpenseTaxReportItemComponent } from './expense-tax-report-item.component';
import { ExpenseService } from '../../../../expense/expense.service';
import { TranslationService } from '@core/services/translation.service';
import { Expense } from '@core/domain-classes/expense';

describe('ExpenseTaxReportItemComponent', () => {
  let component: ExpenseTaxReportItemComponent;
  let fixture: ComponentFixture<ExpenseTaxReportItemComponent>;
  let expenseService: jasmine.SpyObj<ExpenseService>;
  let translationService: jasmine.SpyObj<TranslationService>;

  const taxItems: any[] = [
    { taxName: 'GST 17%', taxValue: 17 },
    { taxName: 'GST 5%', taxValue: 5 },
  ];
  const expenseWithTaxes = { id: 'ex-1', expenseTaxes: taxItems } as unknown as Expense;

  beforeEach(() => {
    expenseService = jasmine.createSpyObj<ExpenseService>('ExpenseService', ['getExpenseTaxItems']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();

    TestBed.configureTestingModule({
      imports: [ExpenseTaxReportItemComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        CurrencyPipe,
        provideNativeDateAdapter(),
        { provide: JwtHelperService, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: ExpenseService, useValue: expenseService },
        { provide: TranslationService, useValue: translationService },
      ],
    });
  });

  function create(): void {
    fixture = TestBed.createComponent(ExpenseTaxReportItemComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('expense', expenseWithTaxes);
    expenseService.getExpenseTaxItems.and.returnValue(of(taxItems));
    fixture.detectChanges();
  }

  it('should create and seed tax items from the bound expense (no service call on init)', fakeAsync(() => {
    create();
    expect(component).toBeTruthy();
    expect(expenseService.getExpenseTaxItems).not.toHaveBeenCalled();
    expect(component.expenseTaxItems).toEqual(taxItems);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('GST 17%');
    expect(text).toContain('GST 5%');
  }));

  it('getExpenseTaxItems loads tax items from the service by expense id', fakeAsync(() => {
    create();
    component.expenseTaxItems = [];
    component.getExpenseTaxItems();
    expect(expenseService.getExpenseTaxItems).toHaveBeenCalledWith('ex-1');
    expect(component.expenseTaxItems).toEqual(taxItems);
  }));

  it('row helpers index the loaded tax items', fakeAsync(() => {
    create();
    expect(component.isOddDataRow(0)).toBeFalse();
    expect(component.isOddDataRow(1)).toBeTrue();
    expect(component.getDataIndex(taxItems[1])).toBe(1);
    expect(component.getDataIndex({} as any)).toBe(-1);
  }));
});
