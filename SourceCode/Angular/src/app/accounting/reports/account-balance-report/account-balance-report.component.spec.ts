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

import { AccountBalanceReportComponent } from './account-balance-report.component';
import { ReportService } from '../report.service';
import { CommonService } from '@core/services/common.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { FinancialYearService } from '../../financial-year/financial-year.service';
import { LedgerAccountBalances } from './ledger-account-balances';

describe('AccountBalanceReportComponent', () => {
  let component: AccountBalanceReportComponent;
  let fixture: ComponentFixture<AccountBalanceReportComponent>;
  let reportService: jasmine.SpyObj<ReportService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let financialYearService: jasmine.SpyObj<FinancialYearService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  const balances: LedgerAccountBalances[] = [
    { accountName: 'Cash', debitTotals: 100, creditTotal: 0 },
    { accountName: 'Sales', debitTotals: 0, creditTotal: 250 },
  ];

  beforeEach(() => {
    reportService = jasmine.createSpyObj<ReportService>('ReportService', ['getAccountBalanceReport']);
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
      imports: [AccountBalanceReportComponent, TranslateModule.forRoot()],
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
    reportService.getAccountBalanceReport.and.returnValue(of(balances));
    fixture = TestBed.createComponent(AccountBalanceReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }

  it('should create, seed financial year and location then load report once', fakeAsync(() => {
    create();
    expect(component).toBeTruthy();
    expect(reportService.getAccountBalanceReport).toHaveBeenCalledOnceWith('fy1', 'loc1');
    expect(component.ledgerAccountBalances).toEqual(balances);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('Cash');
    expect(text).toContain('Sales');
  }));

  it('getReportData skips api when required financial year missing', fakeAsync(() => {
    create();
    reportService.getAccountBalanceReport.calls.reset();
    component.searchForm.get('financialYearId')?.setValue('');
    component.getReportData();
    expect(component.searchForm.touched).toBeTrue();
    expect(reportService.getAccountBalanceReport).not.toHaveBeenCalled();
  }));

  it('onClear resets location to first and reloads report', fakeAsync(() => {
    create();
    reportService.getAccountBalanceReport.calls.reset();
    component.searchForm.get('locationId')?.setValue('');
    component.onClear();
    expect(component.searchForm.get('locationId')?.value).toBe('loc1');
    expect(reportService.getAccountBalanceReport).toHaveBeenCalledOnceWith('fy1', 'loc1');
    expect(component.ledgerAccountBalances).toEqual(balances);
  }));

  it('onDownloadReport reports error when balances missing or empty', fakeAsync(() => {
    create();
    component.ledgerAccountBalances = undefined as any;
    component.onDownloadReport('pdf');
    component.ledgerAccountBalances = [];
    component.onDownloadReport('pdf');
    expect(toastrService.error).toHaveBeenCalledTimes(2);
    expect(toastrService.error).toHaveBeenCalledWith('TRANSLATED');
  }));

  it('onDownloadReport email path builds pdf and opens send-email dialog', fakeAsync(() => {
    create();
    dialog.open.and.returnValue({ afterClosed: () => of(void 0) } as any);
    component.onDownloadReport('email');
    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({
      data: jasmine.objectContaining({ name: 'TRANSLATED.pdf', contentType: 'application/pdf', subject: 'TRANSLATED' }),
    }));
  }));
});
