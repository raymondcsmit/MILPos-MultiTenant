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

import { CashBankReportComponent } from './cash-bank-report.component';
import { ReportService } from '../report.service';
import { CommonService } from '@core/services/common.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { FinancialYearService } from '../../financial-year/financial-year.service';
import { CashBankReport } from './cash-bank-report';

describe('CashBankReportComponent', () => {
  let component: CashBankReportComponent;
  let fixture: ComponentFixture<CashBankReportComponent>;
  let reportService: jasmine.SpyObj<ReportService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let financialYearService: jasmine.SpyObj<FinancialYearService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  const cashBankReport: CashBankReport = { cashTotal: 150, bankTotal: 250 };

  beforeEach(() => {
    reportService = jasmine.createSpyObj<ReportService>('ReportService', ['getCashBankReport']);
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
      imports: [CashBankReportComponent, TranslateModule.forRoot()],
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
    reportService.getCashBankReport.and.returnValue(of(cashBankReport));
    fixture = TestBed.createComponent(CashBankReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }

  it('should create and load report once form gets valid financial year and location', fakeAsync(() => {
    create();
    expect(component).toBeTruthy();
    expect(reportService.getCashBankReport).toHaveBeenCalledOnceWith('fy1', 'loc1');
    expect(component.cashBankReport).toEqual(cashBankReport);
  }));

  it('onClear resets location to first and reloads report synchronously', fakeAsync(() => {
    create();
    reportService.getCashBankReport.calls.reset();
    component.onClear();
    expect(component.searchForm.get('locationId')?.value).toBe('loc1');
    expect(reportService.getCashBankReport).toHaveBeenCalledOnceWith('fy1', 'loc1');
    expect(component.cashBankReport).toEqual(cashBankReport);
  }));

  it('onDownloadReport reports error when report null or totals zero', fakeAsync(() => {
    create();
    component.cashBankReport = null;
    component.onDownloadReport('pdf');
    component.cashBankReport = { cashTotal: 0, bankTotal: 0 } as CashBankReport;
    component.onDownloadReport('pdf');
    expect(toastrService.error).toHaveBeenCalledTimes(2);
    expect(toastrService.error).toHaveBeenCalledWith('TRANSLATED');
  }));

  it('onDownloadReport email path builds pdf and opens send-email dialog', fakeAsync(() => {
    create();
    dialog.open.and.returnValue({ afterClosed: () => of(void 0) } as any);
    component.onDownloadReport('pdf', true);
    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({
      data: jasmine.objectContaining({ name: 'TRANSLATED.pdf', contentType: 'application/pdf', subject: 'TRANSLATED' }),
    }));
  }));
});
