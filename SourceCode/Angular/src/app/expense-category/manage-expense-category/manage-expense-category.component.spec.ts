import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { ManageExpenseCategoryComponent } from './manage-expense-category.component';
import { ExpenseCategoryService } from '@core/services/expense-category.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { ExpenseCategory } from '@core/domain-classes/expense-category';

describe('ManageExpenseCategoryComponent', () => {
  let component: ManageExpenseCategoryComponent;
  let fixture: ComponentFixture<ManageExpenseCategoryComponent>;
  let expenseCategoryService: jasmine.SpyObj<ExpenseCategoryService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialogRef: { close: jasmine.Spy };

  function create(data: ExpenseCategory): void {
    dialogRef = { close: jasmine.createSpy('close') };
    TestBed.overrideProvider(MatDialogRef, { useValue: dialogRef });
    TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: data });
    fixture = TestBed.createComponent(ManageExpenseCategoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    expenseCategoryService = jasmine.createSpyObj<ExpenseCategoryService>('ExpenseCategoryService', ['add', 'update']);
    expenseCategoryService.add.and.returnValue(of({ id: 'ec1', name: 'Added' } as ExpenseCategory));
    expenseCategoryService.update.and.returnValue(of({ id: 'ec2', name: 'Updated' } as ExpenseCategory));
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();

    TestBed.configureTestingModule({
      imports: [ManageExpenseCategoryComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: ExpenseCategoryService, useValue: expenseCategoryService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
    });
  });

  it('should create with required name in add mode', () => {
    create({} as ExpenseCategory);
    expect(component).toBeTruthy();
    expect(component.isEdit).toBeFalse();
    expect(component.expenseCategoryForm.get('name')?.hasError('required')).toBeTrue();
  });

  it('prefills name and enters edit mode from dialog data', () => {
    create({ id: 'ec2', name: 'Travel' } as ExpenseCategory);
    expect(component.isEdit).toBeTrue();
    expect(component.expenseCategoryForm.get('name')?.value).toBe('Travel');
  });

  it('invalid submit does not call service and marks touched', () => {
    create({} as ExpenseCategory);
    component.saveExpenseCategory();
    expect(expenseCategoryService.add).not.toHaveBeenCalled();
    expect(expenseCategoryService.update).not.toHaveBeenCalled();
    expect(component.expenseCategoryForm.get('name')?.touched).toBeTrue();
  });

  it('valid submit adds category and closes dialog with result', () => {
    create({} as ExpenseCategory);
    component.expenseCategoryForm.get('name')?.setValue('Travel');
    component.saveExpenseCategory();
    expect(expenseCategoryService.add).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'Travel' }));
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
    expect(dialogRef.close).toHaveBeenCalledWith({ id: 'ec1', name: 'Added' });
  });

  it('valid submit in edit mode updates by data id', () => {
    create({ id: 'ec2', name: 'Travel' } as ExpenseCategory);
    component.expenseCategoryForm.get('name')?.setValue('Travel Reimbursed');
    component.saveExpenseCategory();
    expect(expenseCategoryService.update).toHaveBeenCalledWith('ec2', jasmine.objectContaining({ name: 'Travel Reimbursed' }));
    expect(expenseCategoryService.add).not.toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledWith({ id: 'ec2', name: 'Updated' });
  });

  it('cancel closes dialog without saving', () => {
    create({} as ExpenseCategory);
    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalled();
    expect(expenseCategoryService.add).not.toHaveBeenCalled();
  });
});
