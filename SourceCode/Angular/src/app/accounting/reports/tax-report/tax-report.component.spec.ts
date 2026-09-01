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

import { TaxReportComponent } from './tax-report.component';
import { ReportService } from '../report.service';
import { CommonService } from '@core/services/common.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { FinancialYearService } from '../../financial-year/financial-year.service';
import { TaxReport } from './tax-report';

describe('TaxReportComponent', () => {
  let component: TaxReportComponent;
  let fixture: ComponentFixture<TaxReportComponent>;
  let reportService: jasmine.SpyObj<ReportService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let financialYearService: jasmine.SpyObj<FinancialYearService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  const taxReport: TaxReport = {
    inputGstTotal: 100,
    inputGstReturnTotal: 10,
    outputGstTotal: 700,
    outputGstReturnTotal: 90,
    netTaxPayable: 500,
    status: 'Payable',
    inputTaxes: [{ taxName: 'GST 17%', amount: 100 }],
    outputTaxes: [{ taxName: 'GST 5%', amount: 700 }],
  };

  beforeEach(() => {
    reportService = jasmine.createSpyObj<ReportService>('ReportService', ['getTaxReport']);
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
      imports: [TaxReportComponent, TranslateModule.forRoot()],
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
    reportService.getTaxReport.and.returnValue(of(taxReport));
    fixture = TestBed.createComponent(TaxReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }

  it('should create, seed financial year and location then load report once', fakeAsync(() => {
    create();
    expect(component).toBeTruthy();
    expect(reportService.getTaxReport).toHaveBeenCalledOnceWith('fy1', 'loc1');
    expect(component.taxReport).toEqual(taxReport);
    const text = fixture.nativeElement.textContent || '';
    expect(text).toContain('Payable');
    expect(text).toContain('GST 17%');
  }));

  it('getReportData skips api when required financial year missing', fakeAsync(() => {
    create();
    reportService.getTaxReport.calls.reset();
    component.searchForm.get('financialYearId')?.setValue('');
    component.getReportData();
    expect(component.searchForm.touched).toBeTrue();
    expect(reportService.getTaxReport).not.toHaveBeenCalled();
  }));

  it('onClear resets location to first and reloads report', fakeAsync(() => {
    create();
    reportService.getTaxReport.calls.reset();
    component.searchForm.get('locationId')?.setValue('');
    component.onClear();
    expect(component.searchForm.get('locationId')?.value).toBe('loc1');
    expect(reportService.getTaxReport).toHaveBeenCalledOnceWith('fy1', 'loc1');
    expect(component.taxReport).toEqual(taxReport);
  }));

  it('onDownloadReport reports error when report null or netTaxPayable zero', fakeAsync(() => {
    create();
    component.taxReport = null;
    component.onDownloadReport('pdf');
    component.taxReport = { ...taxReport, netTaxPayable: 0 };
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
