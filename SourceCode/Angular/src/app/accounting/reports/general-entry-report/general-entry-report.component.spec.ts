import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { BehaviorSubject, of } from 'rxjs';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';

import { GeneralEntryReportComponent } from './general-entry-report.component';
import { ReportService } from '../report.service';
import { CommonService } from '@core/services/common.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { FinancialYearService } from '../../financial-year/financial-year.service';
import { GeneralEntry } from './general-entry';
import { AccountType, TransactionType } from '../../account-enum';

describe('GeneralEntryReportComponent', () => {
  let component: GeneralEntryReportComponent;
  let fixture: ComponentFixture<GeneralEntryReportComponent>;
  let reportService: jasmine.SpyObj<ReportService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let financialYearService: jasmine.SpyObj<FinancialYearService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  const entries: GeneralEntry[] = [
    { transactionNumber: 'TR-1', transactionType: TransactionType.DirectEntry, accountCode: '1000', accountName: 'Cash', debitAmount: 100, creditAmount: 0, accountType: AccountType.Asset, createdDate: '2026-01-01T00:00:00Z' } as unknown as GeneralEntry,
    { transactionNumber: 'TR-2', transactionType: TransactionType.Sale, accountCode: '2000', accountName: 'Sales', debitAmount: 0, creditAmount: 100, accountType: AccountType.Income, createdDate: '2026-01-02T00:00:00Z' } as unknown as GeneralEntry,
  ];

  function paginated<T>(body: T[]): HttpResponse<T[]> {
    return new HttpResponse({
      body,
      headers: new HttpHeaders({ 'X-Pagination': JSON.stringify({ totalCount: body.length, pageSize: 30, skip: 0 }) }),
    });
  }

  beforeEach(() => {
    reportService = jasmine.createSpyObj<ReportService>('ReportService', ['getAllGeneralEntry', 'getAllPaymentReports']);
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getLocationsForReport', 'getFinancialYearsForReport']);
    commonService.getLocationsForReport.and.returnValue(of({ locations: [{ id: 'loc1', name: 'Main' } as any], selectedLocation: 'loc1' } as any));
    commonService.getFinancialYearsForReport.and.returnValue(of({ financialYears: [{ id: 'fy1', name: 'FY26' } as any], selectedFinancialYearId: 'fy1' } as any));
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    financialYearService = jasmine.createSpyObj<FinancialYearService>('FinancialYearService', ['getAllFinancialYear']);
    financialYearService.getAllFinancialYear.and.returnValue(of([]));
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);

    TestBed.configureTestingModule({
      imports: [GeneralEntryReportComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNativeDateAdapter(),
        CurrencyPipe,
        { provide: JwtHelperService, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: ReportService, useValue: reportService },
        { provide: CommonService, useValue: commonService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: FinancialYearService, useValue: financialYearService },
        { provide: MatDialog, useValue: dialog },
      ],
    });
  });

  function create(): void {
    reportService.getAllGeneralEntry.and.returnValue(of(paginated(entries)));
    fixture = TestBed.createComponent(GeneralEntryReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick(400);
    fixture.detectChanges();
  }

  it('should create, load entries via store and render rows', fakeAsync(() => {
    create();
    expect(component).toBeTruthy();
    expect(reportService.getAllGeneralEntry).toHaveBeenCalled();
    expect(component.generalEntryStore.generalEntrys().length).toBe(2);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('TR-1');
    expect(text).toContain('Sales');
    expect(component.paginator.length).toBe(2);
  }));

  it('onSearch copies form filters into resource, resets skip and reloads', fakeAsync(() => {
    create();
    reportService.getAllGeneralEntry.calls.reset();
    component.searchForm.patchValue({
      transactionNumber: 'TR-1',
      fromDate: new Date(2026, 0, 1),
      toDate: new Date(2026, 0, 31),
      branchId: 'loc1',
      financialYearId: 'fy1',
    });
    component.onSearch();
    tick(400);
    const args = reportService.getAllGeneralEntry.calls.mostRecent().args[0];
    expect(args.transactionNumber).toBe('TR-1');
    expect(args.branchId).toBe('loc1');
    expect(args.financialYearId).toBe('fy1');
    expect(args.skip).toBe(0);
    expect(component.paginator.pageIndex).toBe(0);
  }));

  it('onClear rebuilds resource from store defaults, falls back to first location and reloads', fakeAsync(() => {
    create();
    component.searchForm.patchValue({ transactionNumber: 'TR-1' });
    component.onSearch();
    tick(400);
    reportService.getAllGeneralEntry.calls.reset();
    component.onClear();
    tick(400);
    const args = reportService.getAllGeneralEntry.calls.mostRecent().args[0];
    expect(args.branchId).toBe('loc1');
    expect(args.skip).toBe(0);
    expect(component.searchForm.get('transactionNumber')?.value).toBe('');
    expect(component.paginator.pageIndex).toBe(0);
  }));

  it('sort change updates orderBy, resets page index and reloads', fakeAsync(() => {
    create();
    reportService.getAllGeneralEntry.calls.reset();
    component.sort.active = 'accountName';
    component.sort.direction = 'desc';
    component.sort.sortChange.emit({ active: 'accountName', direction: 'desc' } as Sort);
    tick(400);
    const args = reportService.getAllGeneralEntry.calls.mostRecent().args[0];
    expect(args.orderBy).toBe('accountName desc');
    expect(args.skip).toBe(0);
    expect(component.paginator.pageIndex).toBe(0);
  }));

  it('paginator page computes skip from pageIndex and pageSize', fakeAsync(() => {
    create();
    reportService.getAllGeneralEntry.calls.reset();
    component.paginator.pageIndex = 1;
    component.paginator.pageSize = 10;
    component.paginator.page.emit({ pageIndex: 1, pageSize: 10, length: 2 } as PageEvent);
    tick(400);
    const args = reportService.getAllGeneralEntry.calls.mostRecent().args[0];
    expect(args.skip).toBe(10);
    expect(args.pageSize).toBe(10);
  }));

  it('filterObservable$ debounces and reloads with skip reset', fakeAsync(() => {
    create();
    reportService.getAllGeneralEntry.calls.reset();
    component.filterObservable$.next('search-term');
    tick(1400);
    expect(reportService.getAllGeneralEntry).toHaveBeenCalled();
    const args = reportService.getAllGeneralEntry.calls.mostRecent().args[0];
    expect(args.skip).toBe(0);
  }));

  it('refresh reloads with current resource', fakeAsync(() => {
    create();
    reportService.getAllGeneralEntry.calls.reset();
    component.refresh();
    tick(400);
    expect(reportService.getAllGeneralEntry).toHaveBeenCalled();
  }));

  it('onDownloadReport reports error when no entries returned', fakeAsync(() => {
    create();
    reportService.getAllGeneralEntry.and.returnValue(of(paginated([])));
    component.onDownloadReport('pdf');
    expect(toastrService.error).toHaveBeenCalledWith('TRANSLATED');
  }));

  it('onDownloadReport email path builds pdf and opens send-email dialog', fakeAsync(() => {
    create();
    dialog.open.and.returnValue({ afterClosed: () => of(void 0) } as any);
    component.onDownloadReport('email');
    const args = reportService.getAllGeneralEntry.calls.mostRecent().args[0];
    expect(args.pageSize).toBe(0);
    expect(args.skip).toBe(0);
    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({
      data: jasmine.objectContaining({ name: 'TRANSLATED.pdf', contentType: 'application/pdf', subject: 'TRANSLATED' }),
    }));
  }));

  it('addGeneralEntry opens dialog and reloads on close with result', fakeAsync(() => {
    create();
    reportService.getAllGeneralEntry.calls.reset();
    dialog.open.and.returnValue({ afterClosed: () => of(true) } as any);
    component.addGeneralEntry();
    tick(400);
    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({ disableClose: true }));
    expect(reportService.getAllGeneralEntry).toHaveBeenCalled();
    const args = reportService.getAllGeneralEntry.calls.mostRecent().args[0];
    expect(args.skip).toBe(0);
  }));
});
