import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { PurchaseOrderExpectedDeliveryComponent } from './purchase-order-expected-delivery.component';
import { DashboardService } from '../dashboard.service';
import { SecurityService } from '@core/security/security.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';

describe('PurchaseOrderExpectedDeliveryComponent', () => {
  let component: PurchaseOrderExpectedDeliveryComponent;
  let fixture: ComponentFixture<PurchaseOrderExpectedDeliveryComponent>;
  let dashboardService: jasmine.SpyObj<DashboardService>;

  const rows = [
    { orderNo: 'PO-1', supplierName: 'Supplier A', quantity: 3 },
  ];

  beforeEach(() => {
    dashboardService = jasmine.createSpyObj<DashboardService>('DashboardService', [
      'getPurchaseOrderRecentDeliverySchedule',
    ]);
    const translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    (translationService as any).lanDir$ = of('ltr');

    TestBed.configureTestingModule({
      imports: [PurchaseOrderExpectedDeliveryComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DashboardService, useValue: dashboardService },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: TranslationService, useValue: translationService },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
      ],
    });
  });

  function createFixture(): void {
    fixture = TestBed.createComponent(PurchaseOrderExpectedDeliveryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and load the delivery schedule', () => {
    dashboardService.getPurchaseOrderRecentDeliverySchedule.and.returnValue(of(rows as any));
    createFixture();
    expect(component).toBeTruthy();
    expect(dashboardService.getPurchaseOrderRecentDeliverySchedule).toHaveBeenCalledOnceWith();
    expect(component.dataSource).toBe(rows as any);
    expect(component.loading).toBeFalse();
  });

  it('should stop loading when the request fails', () => {
    dashboardService.getPurchaseOrderRecentDeliverySchedule.and.returnValue(throwError(() => new Error('boom')));
    createFixture();
    expect(component.loading).toBeFalse();
    expect(component.dataSource).toEqual([]);
  });
});
