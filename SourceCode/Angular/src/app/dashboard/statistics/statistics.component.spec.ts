import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { StatisticsComponent } from './statistics.component';
import { DashboardService } from '../dashboard.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { TranslationService } from '@core/services/translation.service';
import { DashboardStaticatics } from '@core/domain-classes/dashboard-staticatics';

describe('StatisticsComponent', () => {
  let component: StatisticsComponent;
  let fixture: ComponentFixture<StatisticsComponent>;
  let dashboardService: jasmine.SpyObj<DashboardService>;
  let commonService: jasmine.SpyObj<CommonService>;

  const stats: DashboardStaticatics = {
    totalPurchase: 100,
    totalSales: 200,
    totalSalesReturn: 10,
    totalPurchaseReturn: 20,
  };

  beforeEach(() => {
    dashboardService = jasmine.createSpyObj<DashboardService>('DashboardService', ['getDashboardStaticatics']);
    dashboardService.getDashboardStaticatics.and.returnValue(of(stats));
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getLocationsForReport']);
    commonService.getLocationsForReport.and.returnValue(
      of({ locations: [{ id: 'l1', name: 'Main' } as any], selectedLocation: 'l1' } as any)
    );

    const securityService = jasmine.createSpyObj<SecurityService>('SecurityService', ['hasClaim']);
    (securityService as any).currencyCode = 'USD';
    const translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    (translationService as any).lanDir$ = of('ltr');

    TestBed.configureTestingModule({
      imports: [StatisticsComponent, TranslateModule.forRoot()],
      providers: [
        CurrencyPipe,
        provideNativeDateAdapter(),
        { provide: DashboardService, useValue: dashboardService },
        { provide: CommonService, useValue: commonService },
        { provide: SecurityService, useValue: securityService },
        { provide: TranslationService, useValue: translationService },
      ],
    });
    fixture = TestBed.createComponent(StatisticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create, load locations and fetch statistics for the selected location', () => {
    expect(component).toBeTruthy();
    expect(component.locations.length).toBe(1);
    expect(component.searchForm.get('locationId')?.value).toBe('l1');
    expect(dashboardService.getDashboardStaticatics).toHaveBeenCalledOnceWith(
      jasmine.any(Date),
      jasmine.any(Date),
      'l1'
    );
    expect(component.dashboardStaticatics).toEqual(stats);
  });

  it('should refetch statistics when a search field changes', () => {
    component.searchForm.get('fromDate')?.setValue(new Date(2026, 0, 1));
    expect(dashboardService.getDashboardStaticatics).toHaveBeenCalledTimes(2);
    expect(dashboardService.getDashboardStaticatics).toHaveBeenCalledWith(
      new Date(2026, 0, 1),
      jasmine.any(Date),
      'l1'
    );
  });

  it('should skip fetching when the date range is invalid', () => {
    component.searchForm.get('toDate')?.setValue(new Date(2026, 0, 10));
    expect(dashboardService.getDashboardStaticatics).toHaveBeenCalledTimes(2);

    component.searchForm.get('fromDate')?.setValue(new Date(2026, 0, 20));
    expect(component.searchForm.hasError('dateRange')).toBeTrue();

    component.getDashboardStaticatics();
    expect(dashboardService.getDashboardStaticatics).toHaveBeenCalledTimes(2);
  });
});
