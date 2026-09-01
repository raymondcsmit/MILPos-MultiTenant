import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { TranslateModule } from '@ngx-translate/core';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { By } from '@angular/platform-browser';

import { DashboardComponent } from './dashboard.component';
import { DashboardService } from './dashboard.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { TranslationService } from '@core/services/translation.service';
import { ToastrService } from '@core/services/toastr.service';
import { MatDialog } from '@angular/material/dialog';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let dashboardService: jasmine.SpyObj<DashboardService>;
  let securityService: jasmine.SpyObj<SecurityService>;

  beforeEach(() => {
    dashboardService = jasmine.createSpyObj<DashboardService>('DashboardService', [
      'getDashboardStaticatics', 'getBestSellingProducts', 'getProductStockAlerts',
      'getPurchaseOrderRecentDeliverySchedule', 'getSalesOrderRecentShipment',
      'getProductSalesComparison', 'getIncomeComparison', 'getSalesComparison',
    ]);
    dashboardService.getDashboardStaticatics.and.returnValue(of({ totalPurchase: 0, totalSales: 0, totalSalesReturn: 0, totalPurchaseReturn: 0 }));
    dashboardService.getBestSellingProducts.and.returnValue(of([]));
    dashboardService.getProductStockAlerts.and.returnValue(
      of(new HttpResponse({ body: [], headers: new HttpHeaders().set('X-Pagination', JSON.stringify({})) }))
    );
    dashboardService.getPurchaseOrderRecentDeliverySchedule.and.returnValue(of([]));
    dashboardService.getSalesOrderRecentShipment.and.returnValue(of([]));
    dashboardService.getProductSalesComparison.and.returnValue(of([]));
    dashboardService.getIncomeComparison.and.returnValue(of([]));
    dashboardService.getSalesComparison.and.returnValue(of([]));

    securityService = jasmine.createSpyObj<SecurityService>('SecurityService', ['hasClaim']);
    securityService.hasClaim.and.returnValue(true);
    (securityService as any).currencyCode = 'USD';
    (securityService as any).companyProfile = of(null);

    const commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getLocationsForReport', 'getPageHelperText']);
    commonService.getLocationsForReport.and.returnValue(of({ locations: [], selectedLocation: null } as any));

    const translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    (translationService as any).lanDir$ = of('ltr');

    TestBed.configureTestingModule({
      imports: [DashboardComponent, TranslateModule.forRoot()],
      providers: [
        CurrencyPipe,
        provideNativeDateAdapter(),
        { provide: DashboardService, useValue: dashboardService },
        { provide: CommonService, useValue: commonService },        { provide: SecurityService, useValue: securityService },
        { provide: TranslationService, useValue: translationService },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'error']) },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
      ],
    });
  });

  function createFixture(): void {
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and render all claimed dashboard widgets', () => {
    createFixture();
    expect(component).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-statistics'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-sales-order-expected-shipment'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-purchase-order-expected-delivery'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-product-stock-alert'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-income-comparison'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-sales-comparison'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-best-selling-product'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-product-sales-comparison'))).toBeTruthy();
  });

  it('should trigger every child widget data load', () => {
    createFixture();
    expect(dashboardService.getDashboardStaticatics).toHaveBeenCalled();
    expect(dashboardService.getBestSellingProducts).toHaveBeenCalled();
    expect(dashboardService.getProductStockAlerts).toHaveBeenCalled();
    expect(dashboardService.getPurchaseOrderRecentDeliverySchedule).toHaveBeenCalled();
    expect(dashboardService.getSalesOrderRecentShipment).toHaveBeenCalled();
    expect(dashboardService.getProductSalesComparison).toHaveBeenCalled();
    expect(dashboardService.getIncomeComparison).toHaveBeenCalled();
    expect(dashboardService.getSalesComparison).toHaveBeenCalled();
  });

  it('should render no widgets when the user has no dashboard claims', () => {
    securityService.hasClaim.and.returnValue(false);
    createFixture();
    expect(fixture.debugElement.query(By.css('app-statistics'))).toBeNull();
    expect(fixture.debugElement.query(By.css('app-product-stock-alert'))).toBeNull();
    expect(dashboardService.getDashboardStaticatics).not.toHaveBeenCalled();
    expect(dashboardService.getProductStockAlerts).not.toHaveBeenCalled();
  });
});
