import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { SalesOrderExpectedShipmentComponent } from './sales-order-expected-shipment.component';
import { DashboardService } from '../dashboard.service';
import { SecurityService } from '@core/security/security.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';

describe('SalesOrderExpectedShipmentComponent', () => {
  let component: SalesOrderExpectedShipmentComponent;
  let fixture: ComponentFixture<SalesOrderExpectedShipmentComponent>;
  let dashboardService: jasmine.SpyObj<DashboardService>;

  const rows = [
    { orderNo: 'SO-1', customerName: 'Customer A', quantity: 4 },
  ];

  beforeEach(() => {
    dashboardService = jasmine.createSpyObj<DashboardService>('DashboardService', ['getSalesOrderRecentShipment']);
    dashboardService.getSalesOrderRecentShipment.and.returnValue(of(rows as any));
    const translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    (translationService as any).lanDir$ = of('ltr');

    TestBed.configureTestingModule({
      imports: [SalesOrderExpectedShipmentComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DashboardService, useValue: dashboardService },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: TranslationService, useValue: translationService },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
      ],
    });
    fixture = TestBed.createComponent(SalesOrderExpectedShipmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load the shipment schedule in the constructor', () => {
    expect(component).toBeTruthy();
    expect(dashboardService.getSalesOrderRecentShipment).toHaveBeenCalledOnceWith();
    expect(component.dataSource).toBe(rows as any);
  });

  it('should expose row helpers used by the template', () => {
    expect(component.isOddDataRow(0)).toBeFalse();
    expect(component.isOddDataRow(1)).toBeTrue();
    expect(component.getDataIndex((component.dataSource as any)[0])).toBe(0);
  });
});
