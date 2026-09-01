import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { provideNativeDateAdapter } from '@angular/material/core';
import { BehaviorSubject, of } from 'rxjs';

import { SalesPurchaseReportComponent } from './sales-purchase-report.component';
import { SalesPurchaseReportService } from './sales-purchase-report.service';
import { CommonService } from '@core/services/common.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { SalesVsPurchase } from '@core/domain-classes/sales-purchase';

describe('SalesPurchaseReportComponent', () => {
  let component: SalesPurchaseReportComponent;
  let fixture: ComponentFixture<SalesPurchaseReportComponent>;
  let salesPurchaseReportService: jasmine.SpyObj<SalesPurchaseReportService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let translationService: jasmine.SpyObj<TranslationService>;

  beforeEach(() => {
    salesPurchaseReportService = jasmine.createSpyObj<SalesPurchaseReportService>('SalesPurchaseReportService', ['getSalesVsPurchaseReport']);
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getLocationsForReport']);
    commonService.getLocationsForReport.and.returnValue(of({ locations: [{ id: 'loc1', name: 'Main' } as any], selectedLocation: 'loc1' } as any));
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    const securityService = jasmine.createSpyObj('SecurityService', ['hasClaim']);
    (securityService as any).currencyCode = 'USD';
    securityService.hasClaim.and.returnValue(true);

    TestBed.configureTestingModule({
      imports: [SalesPurchaseReportComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideNativeDateAdapter(),
        { provide: SalesPurchaseReportService, useValue: salesPurchaseReportService },
        { provide: CommonService, useValue: commonService },
        { provide: TranslationService, useValue: translationService },
        { provide: SecurityService, useValue: securityService },
      ],
    });
    salesPurchaseReportService.getSalesVsPurchaseReport.and.returnValue(of([]));
  });

  function create(): void {
    fixture = TestBed.createComponent(SalesPurchaseReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create, default the date range and fetch the report for the selected location', () => {
    create();
    expect(component).toBeTruthy();
    expect(component.searchForm.get('fromDate')?.value).toEqual(component.FromDate);
    expect(component.searchForm.get('toDate')?.value).toEqual(component.ToDate);
    expect(component.searchForm.get('locationId')?.value).toBe('loc1');
    expect(salesPurchaseReportService.getSalesVsPurchaseReport).toHaveBeenCalledWith(
      component.FromDate,
      component.ToDate,
      'loc1'
    );
  });

  it('keeps every response row in the chart series because date dedup compares Date objects by identity', () => {
    const data: SalesVsPurchase[] = [
      { date: '2026-01-01T00:00:00Z', totalSales: 100, totalPurchase: 40 },
      { date: '2026-01-01T00:00:00Z', totalSales: 50, totalPurchase: 20 },
      { date: '2026-01-02T00:00:00Z', totalSales: 10, totalPurchase: 5 },
    ];
    salesPurchaseReportService.getSalesVsPurchaseReport.and.returnValue(of(data));
    create();
    expect(component.pieChartOptions.series[0].data).toEqual([100, 50, 10]);
    expect(component.pieChartOptions.series[1].data).toEqual([40, 20, 5]);
    expect(component.pieChartOptions.xAxis[0].data.length).toBe(3);
  });

  it('marks the form touched and skips the fetch when the date range is invalid', () => {
    create();
    salesPurchaseReportService.getSalesVsPurchaseReport.calls.reset();
    component.searchForm.patchValue({ fromDate: new Date(2026, 1, 2), toDate: new Date(2026, 1, 1) });
    expect(component.searchForm.valid).toBeFalse();
    component.getReportData();
    expect(salesPurchaseReportService.getSalesVsPurchaseReport).not.toHaveBeenCalled();
    expect(component.searchForm.get('fromDate')?.touched).toBeTrue();
    expect(component.searchForm.get('toDate')?.touched).toBeTrue();
  });

  it('onClear restores the default dates, first location and refetches', () => {
    create();
    component.searchForm.patchValue({ fromDate: new Date(2025, 0, 1), locationId: 'loc2' });
    salesPurchaseReportService.getSalesVsPurchaseReport.calls.reset();
    component.onClear();
    expect(component.searchForm.get('fromDate')?.value).toEqual(component.FromDate);
    expect(component.searchForm.get('toDate')?.value).toEqual(component.ToDate);
    expect(component.searchForm.get('locationId')?.value).toBe('loc1');
    expect(salesPurchaseReportService.getSalesVsPurchaseReport).toHaveBeenCalledWith(
      component.FromDate,
      component.ToDate,
      'loc1'
    );
  });

  it('onChartInit stores the echarts instance', () => {
    create();
    const fakeChart = { setOption: () => undefined };
    component.onChartInit(fakeChart);
    expect(component.echartsInstance as unknown).toBe(fakeChart);
  });
});
