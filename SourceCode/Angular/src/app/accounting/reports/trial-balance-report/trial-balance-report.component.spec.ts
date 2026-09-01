import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { TrialBalanceReportComponent } from './trial-balance-report.component';
import { ReportService } from '../report.service';
import { CommonService } from '@core/services/common.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { FinancialYearService } from '../../financial-year/financial-year.service';
import { TrialBalance } from './trial-balance';

describe('TrialBalanceReportComponent', () => {
  let component: TrialBalanceReportComponent;
  let fixture: ComponentFixture<TrialBalanceReportComponent>;
  let reportService: jasmine.SpyObj<ReportService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let financialYearService: jasmine.SpyObj<FinancialYearService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  const trialBalance: TrialBalance = {
    debitTotalAmount: 100,
    creditTotalAmount: 100,
    trialBalanceAccounts: [
      { accountName: 'Cash', debitAmount: 100, creditAmount: 0 },
      { accountName: 'Sales', debitAmount: 0, creditAmount: 100 },
    ],
  };

  beforeEach(() => {
    reportService = jasmine.createSpyObj<ReportService>('ReportService', ['getTrialBalanceReport']);
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
      imports: [TrialBalanceReportComponent, TranslateModule.forRoot()],
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
    reportService.getTrialBalanceReport.and.returnValue(of(trialBalance));
    fixture = TestBed.createComponent(TrialBalanceReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }

  it('should create, initialize date defaults and load report for selected location', fakeAsync(() => {
    create();
    expect(component).toBeTruthy();
    expect(component.searchForm.get('fromDate')?.value).toEqual(component.FromDate);
    expect(component.searchForm.get('toDate')?.value).toEqual(component.ToDate);
    expect(reportService.getTrialBalanceReport).toHaveBeenCalledWith(jasmine.any(Date), jasmine.any(Date), 'loc1');
    expect(component.trialBalance).toEqual(trialBalance);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('Cash');
  }));

  it('getReportData marks form touched and skips api when dates missing', fakeAsync(() => {
    create();
    reportService.getTrialBalanceReport.calls.reset();
    component.clearDates();
    component.getReportData();
    expect(reportService.getTrialBalanceReport).not.toHaveBeenCalled();
    expect(component.searchForm.get('fromDate')?.touched).toBeTrue();
    expect(component.searchForm.get('toDate')?.touched).toBeTrue();
  }));

  it('onClear nulls report, resets location to first and attempts reload', fakeAsync(() => {
    create();
    reportService.getTrialBalanceReport.calls.reset();
    component.onClear();
    expect(component.trialBalance).toBeNull();
    expect(component.searchForm.get('locationId')?.value).toBe('loc1');
    expect(reportService.getTrialBalanceReport).not.toHaveBeenCalled();
  }));

  it('onDownloadReport reports error when report is null or totals are zero', fakeAsync(() => {
    create();
    component.trialBalance = null;
    component.onDownloadReport('pdf');
    component.trialBalance = { debitTotalAmount: 0, creditTotalAmount: 0, trialBalanceAccounts: [] } as TrialBalance;
    component.onDownloadReport('pdf');
    expect(toastrService.error).toHaveBeenCalledTimes(2);
    expect(toastrService.error).toHaveBeenCalledWith('TRANSLATED');
  }));

  it('onDownloadReport pdf email path builds pdf and opens send-email dialog', fakeAsync(() => {
    create();
    dialog.open.and.returnValue({ afterClosed: () => of(void 0) } as any);
    component.onDownloadReport('pdf', true);
    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({
      data: jasmine.objectContaining({ name: 'TRANSLATED.pdf', contentType: 'application/pdf', subject: 'TRANSLATED' }),
    }));
  }));
});
