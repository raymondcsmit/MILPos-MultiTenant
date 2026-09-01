import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { BestSellingProductComponent } from './best-selling-product.component';
import { DashboardService } from '../dashboard.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { TranslationService } from '@core/services/translation.service';
import { BestSellingProudct } from '@core/domain-classes/bast-selling-product';

describe('BestSellingProductComponent', () => {
  let component: BestSellingProductComponent;
  let fixture: ComponentFixture<BestSellingProductComponent>;
  let dashboardService: jasmine.SpyObj<DashboardService>;
  let commonService: jasmine.SpyObj<CommonService>;

  const products: BestSellingProudct[] = [
    { name: 'Product A', count: 5 } as BestSellingProudct,
    { name: 'Product B', count: 2 } as BestSellingProudct,
  ];

  beforeEach(() => {
    dashboardService = jasmine.createSpyObj<DashboardService>('DashboardService', ['getBestSellingProducts']);
    dashboardService.getBestSellingProducts.and.returnValue(of(products));
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getLocationsForReport']);
    commonService.getLocationsForReport.and.returnValue(
      of({ locations: [{ id: 'l1', name: 'Main' } as any], selectedLocation: 'l1' } as any)
    );

    const securityService = jasmine.createSpyObj<SecurityService>('SecurityService', ['hasClaim']);
    (securityService as any).currencyCode = 'USD';
    const translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    (translationService as any).lanDir$ = of('ltr');

    TestBed.configureTestingModule({
      imports: [BestSellingProductComponent, TranslateModule.forRoot()],
      providers: [
        CurrencyPipe,
        provideNativeDateAdapter(),
        { provide: DashboardService, useValue: dashboardService },
        { provide: CommonService, useValue: commonService },
        { provide: SecurityService, useValue: securityService },
        { provide: TranslationService, useValue: translationService },
      ],
    });
    fixture = TestBed.createComponent(BestSellingProductComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create, load locations and fetch best selling products', () => {
    expect(component).toBeTruthy();
    expect(component.locations.length).toBe(1);
    expect(component.searchForm.get('locationId')?.value).toBe('l1');
    expect(dashboardService.getBestSellingProducts).toHaveBeenCalledOnceWith(
      jasmine.any(Date),
      jasmine.any(Date),
      'l1'
    );
    expect(component.isDataAvailable).toBeTrue();
  });

  it('should build the bar chart series from the response', () => {
    expect((component.barChartOptions['xAxis'] as any)[0].data).toEqual(['Product A', 'Product B']);
    expect((component.barChartOptions['series'] as any)[0].data).toEqual([5, 2]);
    expect((component.barChartOptions['series'] as any)[0].type).toBe('bar');
  });

  it('should flag when there is no data', () => {
    dashboardService.getBestSellingProducts.and.returnValue(of([]));
    component.getBestSellingProducts();
    expect(component.isDataAvailable).toBeFalse();
    expect((component.barChartOptions['series'] as any)[0].data).toEqual([]);
  });

  it('should refetch when a search field changes', () => {
    component.searchForm.get('fromDate')?.setValue(new Date(2026, 0, 1));
    expect(dashboardService.getBestSellingProducts).toHaveBeenCalledTimes(2);
    expect(dashboardService.getBestSellingProducts).toHaveBeenCalledWith(
      new Date(2026, 0, 1),
      jasmine.any(Date),
      'l1'
    );
  });
});
