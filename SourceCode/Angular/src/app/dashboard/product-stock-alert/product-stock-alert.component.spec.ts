import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';

import { ProductStockAlertComponent } from './product-stock-alert.component';
import { DashboardService } from '../dashboard.service';
import { SecurityService } from '@core/security/security.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';
import { ProductStockAlert } from '@core/domain-classes/product-stock-alert';
import { ProductResourceParameter, ProductType } from '@core/domain-classes/product-resource-parameter';

describe('ProductStockAlertComponent', () => {
  let component: ProductStockAlertComponent;
  let fixture: ComponentFixture<ProductStockAlertComponent>;
  let dashboardService: jasmine.SpyObj<DashboardService>;

  const alerts: ProductStockAlert[] = [
    { productName: 'Product A', businessLocation: 'Main', stock: 2 } as ProductStockAlert,
    { productName: 'Product B', businessLocation: 'Main', stock: 1 } as ProductStockAlert,
  ];

  function makeResponse(): HttpResponse<ProductStockAlert[]> {
    return new HttpResponse({
      body: alerts,
      headers: new HttpHeaders().set(
        'X-Pagination',
        JSON.stringify({ pageSize: 15, skip: 0, totalCount: 2 })
      ),
    });
  }

  beforeEach(() => {
    dashboardService = jasmine.createSpyObj<DashboardService>('DashboardService', ['getProductStockAlerts']);
    dashboardService.getProductStockAlerts.and.returnValue(of(makeResponse()));

    const securityService = jasmine.createSpyObj<SecurityService>('SecurityService', ['hasClaim']);
    (securityService as any).currencyCode = 'USD';
    const translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    (translationService as any).lanDir$ = of('ltr');

    TestBed.configureTestingModule({
      imports: [ProductStockAlertComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DashboardService, useValue: dashboardService },
        { provide: SecurityService, useValue: securityService },
        { provide: TranslationService, useValue: translationService },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
      ],
    });
    fixture = TestBed.createComponent(ProductStockAlertComponent);
    component = fixture.componentInstance;
  });

  it('should create and load the first page sorted by stock desc', fakeAsync(() => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    const firstCall = dashboardService.getProductStockAlerts.calls.argsFor(0)[0] as ProductResourceParameter;
    expect(firstCall.pageSize).toBe(15);
    expect(firstCall.skip).toBe(0);
    expect(firstCall.orderBy).toBe('stock desc');
    expect(firstCall.productType).toBe(ProductType.MainProduct);
    expect(component.productStockAlerts.length).toBe(2);
    expect(component.productResource.totalCount).toBe(2);
  }));

  it('should reload from the first page when the filter stream emits after debounce', fakeAsync(() => {
    fixture.detectChanges();
    component.filterObservable$.next('name:chair');
    tick(1000);
    expect(dashboardService.getProductStockAlerts).toHaveBeenCalledTimes(2);
    const lastCall = dashboardService.getProductStockAlerts.calls.mostRecent().args[0] as ProductResourceParameter;
    expect(lastCall.skip).toBe(0);
    expect(component.paginator.pageIndex).toBe(0);
  }));

  it('should expose row helpers used by the template', fakeAsync(() => {
    fixture.detectChanges();
    expect(component.isOddDataRow(0)).toBeFalse();
    expect(component.isOddDataRow(1)).toBeTrue();
    expect(component.getDataIndex(component.productStockAlerts[1])).toBe(1);
  }));
});
