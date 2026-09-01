import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { ManageFinancialYearComponent } from './manage-financial-year.component';
import { FinancialYearStore } from '../financial-year-store';
import { FinancialYearService } from '../financial-year.service';
import { TranslationService } from '@core/services/translation.service';
import { ToastrService } from '@core/services/toastr.service';
import { CommonService } from '@core/services/common.service';
import { FinancialYear } from '../financial-year';

describe('ManageFinancialYearComponent', () => {
  let component: ManageFinancialYearComponent;
  let fixture: ComponentFixture<ManageFinancialYearComponent>;
  let store: { isAddUpdate: ReturnType<typeof signal<boolean>>; addUpdateFinancialYear: jasmine.Spy; resetflag: jasmine.Spy };
  let financialYearService: jasmine.SpyObj<FinancialYearService>;
  let dialogRef: { close: jasmine.Spy };
  let isAddUpdate: ReturnType<typeof signal<boolean>>;

  const existing = {
    id: 'fy1', startDate: '2026-01-01', endDate: '2026-12-31', isClosed: false,
  } as unknown as FinancialYear;

  beforeEach(() => {
    isAddUpdate = signal(false);
    store = {
      isAddUpdate,
      addUpdateFinancialYear: jasmine.createSpy('addUpdateFinancialYear'),
      resetflag: jasmine.createSpy('resetflag'),
    };
    financialYearService = jasmine.createSpyObj<FinancialYearService>('FinancialYearService', ['getFinancialYear']);
    dialogRef = { close: jasmine.createSpy('close') };

    TestBed.configureTestingModule({
      imports: [ManageFinancialYearComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        { provide: FinancialYearStore, useValue: store },
        { provide: FinancialYearService, useValue: financialYearService },
        { provide: TranslationService, useValue: (() => {
          const spy = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
          (spy as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
          return spy;
        })() },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'error']) },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open', 'closeAll']) },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: null },
      ],
    });
  });

  function create(data: string | null, response: any = existing): void {
    TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: data });
    financialYearService.getFinancialYear.and.returnValue(of(response));
    fixture = TestBed.createComponent(ManageFinancialYearComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and load the financial year by dialog id', () => {
    create('fy1');
    expect(component).toBeTruthy();
    expect(financialYearService.getFinancialYear).toHaveBeenCalledWith('fy1');
    expect(component.financialYearForm.get('startDate')?.value).toBe('2026-01-01');
    expect(component.financialYearForm.get('endDate')?.value).toBe('2026-12-31');
    expect(component.financialYearForm.valid).toBeTrue();
  });

  it('new dialog starts with empty required form', () => {
    create(null, null);
    expect(component.financialYearForm.get('startDate')?.value).toBe('');
    expect(component.financialYearForm.invalid).toBeTrue();
  });

  it('invalid save marks touched and does not call the store', () => {
    create(null, null);
    component.saveFinancialYear();
    expect(component.financialYearForm.get('startDate')?.touched).toBeTrue();
    expect(store.addUpdateFinancialYear).not.toHaveBeenCalled();
  });

  it('valid save delegates to the store with raw form values', () => {
    create('fy1');
    component.saveFinancialYear();
    expect(store.addUpdateFinancialYear).toHaveBeenCalledTimes(1);
    const saved = store.addUpdateFinancialYear.calls.mostRecent().args[0] as FinancialYear;
    expect(saved).toEqual(jasmine.objectContaining({ id: 'fy1', startDate: '2026-01-01', endDate: '2026-12-31' }));
  });

  it('isAddUpdate flag closes the dialog with true and resets the flag', () => {
    create('fy1');
    isAddUpdate.set(true);
    fixture.detectChanges();
    expect(dialogRef.close).toHaveBeenCalledWith(true);
    expect(store.resetflag).toHaveBeenCalled();
  });

  it('close() closes the dialog', () => {
    create('fy1');
    component.close();
    expect(dialogRef.close).toHaveBeenCalled();
  });
});
