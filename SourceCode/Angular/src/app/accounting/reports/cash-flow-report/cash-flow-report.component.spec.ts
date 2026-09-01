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

import { CashFlowReportComponent } from './cash-flow-report.component';
import { ReportService } from '../report.service';
import { CommonService } from '@core/services/common.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { FinancialYearService } from '../../financial-year/financial-year.service';
import { CashFlow } from './cash-flow';

describe('CashFlowReportComponent', () => {
  let component: CashFlowReportComponent;
  let fixture: ComponentFixture<CashFlowReportComponent>;
  let reportService: jasmine.SpyObj<ReportService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let financialYearService: jasmine.SpyObj<FinancialYearService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  const cashFlow: CashFlow = {
    totalCashRecived: 500,
    totalCashPaid: 200,
    netTotalMovement: 300,
    cashFlowAccounts: [
      { accountName: 'Operating', debitAmount: 500, creditAmount: 200, netTotalMovement: 300 },
    ],
  };

  beforeEach(() => {
    reportService = jasmine.createSpyObj<ReportService>('ReportService', ['getCashFlowReport']);
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
      imports: [CashFlowReportComponent, TranslateModule.forRoot()],
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
    reportService.getCashFlowReport.and.returnValue(of(cashFlow));
    fixture = TestBed.createComponent(CashFlowReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }

  it('should create, default date range to FromDate/ToDate and load report for selected location', fakeAsync(() => {
    create();
    expect(component).toBeTruthy();
    expect(reportService.getCashFlowReport).toHaveBeenCalledTimes(2);
    const args = reportService.getCashFlowReport.calls.mostRecent().args;
    expect(args[0] instanceof Date).toBeTrue();
    expect(args[1] instanceof Date).toBeTrue();
    expect(args[2]).toBe('loc1');
    expect(component.cashFlow).toEqual(cashFlow);
    const text = fixture.nativeElement.querySelector('#cash-flow-report')?.textContent || '';
    expect(text).toContain('Operating');
    expect(text).toContain('300');
  }));

  it('getReportData marks form touched and skips api when dates missing', fakeAsync(() => {
    create();
    reportService.getCashFlowReport.calls.reset();
    component.clearDates();
    expect(component.searchForm.get('fromDate')?.value).toBeNull();
    expect(component.searchForm.get('toDate')?.value).toBeNull();
    component.getReportData();
    expect(component.searchForm.touched).toBeTrue();
    expect(reportService.getCashFlowReport).not.toHaveBeenCalled();
  }));

  it('onClear empties dates, invalid form blocks reload and cashFlow stays null', fakeAsync(() => {
    create();
    reportService.getCashFlowReport.calls.reset();
    component.onClear();
    expect(component.searchForm.get('locationId')?.value).toBe('loc1');
    expect(component.cashFlow).toBeNull();
    expect(reportService.getCashFlowReport).not.toHaveBeenCalled();
  }));

  it('onDownloadReport reports error when report missing or accounts empty', fakeAsync(() => {
    create();
    component.cashFlow = null;
    component.onDownloadReport('pdf');
    component.cashFlow = { totalCashRecived: 0, totalCashPaid: 0, netTotalMovement: 0, cashFlowAccounts: [] };
    component.onDownloadReport('pdf');
    expect(toastrService.error).toHaveBeenCalledTimes(2);
    expect(toastrService.error).toHaveBeenCalledWith('TRANSLATED');
  }));

  it('onDownloadReport email path builds pdf and opens send-email dialog', fakeAsync(() => {
    create();
    dialog.open.and.returnValue({ afterClosed: () => of(void 0) } as any);
    component.onDownloadReport('email', true);
    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({
      data: jasmine.objectContaining({ name: 'TRANSLATED.pdf', contentType: 'application/pdf', subject: 'TRANSLATED' }),
    }));
  }));
});
