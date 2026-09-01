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

import { BalanceSheetReportComponent } from './balance-sheet-report.component';
import { ReportService } from '../report.service';
import { CommonService } from '@core/services/common.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { FinancialYearService } from '../../financial-year/financial-year.service';
import { BalanceSheetReport } from './balance-sheet';
import { AccountGroup } from '../../account-enum';

describe('BalanceSheetReportComponent', () => {
  let component: BalanceSheetReportComponent;
  let fixture: ComponentFixture<BalanceSheetReportComponent>;
  let reportService: jasmine.SpyObj<ReportService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let financialYearService: jasmine.SpyObj<FinancialYearService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  const balanceSheet: BalanceSheetReport = {
    totalAssets: 500,
    totalLiabilities: 300,
    totalEquity: 200,
    assets: [{ accountCode: '1000', accountName: 'Cash', group: AccountGroup.CurrentAsset, balance: 500 }],
    liabilities: [{ accountCode: '2000', accountName: 'Payable', group: AccountGroup.CurrentLiability, balance: 300 }],
    equity: [{ accountCode: '3000', accountName: 'Capital', group: AccountGroup.Capital, balance: 200 }],
  };

  beforeEach(() => {
    reportService = jasmine.createSpyObj<ReportService>('ReportService', ['getBalanceSheetReport']);
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
      imports: [BalanceSheetReportComponent, TranslateModule.forRoot()],
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
    reportService.getBalanceSheetReport.and.returnValue(of(balanceSheet));
    fixture = TestBed.createComponent(BalanceSheetReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }

  it('should create and load report only after financial year selection makes form valid', fakeAsync(() => {
    create();
    expect(component).toBeTruthy();
    expect(reportService.getBalanceSheetReport).toHaveBeenCalledOnceWith('fy1', 'loc1');
    expect(component.balanceSheetReport).toEqual(balanceSheet);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('Cash');
    expect(text).toContain('500.00');
  }));

  it('onClear resets location to first and reloads report', fakeAsync(() => {
    create();
    reportService.getBalanceSheetReport.calls.reset();
    component.onClear();
    expect(component.searchForm.get('locationId')?.value).toBe('loc1');
    expect(reportService.getBalanceSheetReport).toHaveBeenCalledOnceWith('fy1', 'loc1');
    expect(component.balanceSheetReport).toEqual(balanceSheet);
  }));

  it('onDownloadReport reports error when report null or liabilities plus equity zero', fakeAsync(() => {
    create();
    component.balanceSheetReport = null;
    component.onDownloadReport('pdf');
    component.balanceSheetReport = { totalAssets: 0, totalLiabilities: 0, totalEquity: 0, assets: [], liabilities: [], equity: [] } as BalanceSheetReport;
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
