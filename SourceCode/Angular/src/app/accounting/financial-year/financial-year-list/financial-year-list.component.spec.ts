import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { FinancialYearListComponent } from './financial-year-list.component';
import { FinancialYearStore } from '../financial-year-store';
import { FinancialYearService } from '../financial-year.service';
import { TranslationService } from '@core/services/translation.service';
import { ToastrService } from '@core/services/toastr.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { FinancialYear } from '../financial-year';

describe('FinancialYearListComponent', () => {
  let component: FinancialYearListComponent;
  let fixture: ComponentFixture<FinancialYearListComponent>;
  let store: { financialYears: () => FinancialYear[]; loadFinancialYears: jasmine.Spy; deleteFinancialYearById: jasmine.Spy };
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  const rows: FinancialYear[] = [
    { id: 'fy1', startDate: '2026-01-01', endDate: '2026-12-31', isClosed: false } as unknown as FinancialYear,
    { id: 'fy0', startDate: '2025-01-01', endDate: '2025-12-31', isClosed: true, closedByName: 'Alice' } as unknown as FinancialYear,
  ];

  beforeEach(() => {
    store = {
      financialYears: () => rows,
      loadFinancialYears: jasmine.createSpy('loadFinancialYears'),
      deleteFinancialYearById: jasmine.createSpy('deleteFinancialYearById'),
    };
    commonDialogService = jasmine.createSpyObj<CommonDialogService>('CommonDialogService', ['deleteConformationDialog']);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);

    TestBed.configureTestingModule({
      imports: [FinancialYearListComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        { provide: FinancialYearStore, useValue: store },
        { provide: FinancialYearService, useValue: jasmine.createSpyObj('FinancialYearService', ['getAllFinancialYear']) },
        { provide: TranslationService, useValue: (() => {
          const spy = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
          (spy as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
          return spy;
        })() },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'error']) },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: CommonDialogService, useValue: commonDialogService },
        { provide: MatDialog, useValue: dialog },
      ],
    });
  });

  function create(): void {
    fixture = TestBed.createComponent(FinancialYearListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and render financial years from the store', () => {
    create();
    expect(component).toBeTruthy();
    expect(store.loadFinancialYears).toHaveBeenCalled();
    const table = fixture.nativeElement.querySelector('table')?.textContent ?? '';
    expect(table).toContain('Alice');
  });

  it('refresh() reloads from the store', () => {
    create();
    const before = store.loadFinancialYears.calls.count();
    component.refresh();
    expect(store.loadFinancialYears.calls.count()).toBeGreaterThan(before);
  });

  it('delete confirmation delegates to the store by id', () => {
    create();
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    component.deleteFinancialYear(rows[0]);
    expect(commonDialogService.deleteConformationDialog).toHaveBeenCalledWith(jasmine.stringContaining('2026-01-01'));
    expect(store.deleteFinancialYearById).toHaveBeenCalledWith('fy1');
  });

  it('declined delete does not touch the store', () => {
    create();
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    component.deleteFinancialYear(rows[0]);
    expect(store.deleteFinancialYearById).not.toHaveBeenCalled();
  });

  it('openManageFinancialYear passes the id and refreshes on closed(true)', () => {
    create();
    dialog.open.and.returnValue({ afterClosed: () => of(true) } as any);
    component.openManageFinancialYear(rows[0]);
    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({ data: 'fy1' }));
    const before = store.loadFinancialYears.calls.count();
    expect(store.loadFinancialYears.calls.count()).toBeGreaterThan(before - 1);
    expect(store.loadFinancialYears).toHaveBeenCalled();
  });

  it('openManageFinancialYear for a new year passes null data', () => {
    create();
    dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as any);
    component.openManageFinancialYear();
    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({ data: null }));
  });
});
