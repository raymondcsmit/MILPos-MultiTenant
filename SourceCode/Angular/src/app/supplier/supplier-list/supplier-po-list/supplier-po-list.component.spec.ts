import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { CurrencyPipe } from '@angular/common';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Sort } from '@angular/material/sort';
import { of } from 'rxjs';

import { SupplierPOListComponent } from './supplier-po-list.component';
import { PurchaseOrderService } from '../../../purchase-order/purchase-order.service';
import { PurchaseOrderResourceParameter } from '@core/domain-classes/purchase-order-resource-parameter';
import { CommonService } from '@core/services/common.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';

describe('SupplierPOListComponent', () => {
  let component: SupplierPOListComponent;
  let fixture: ComponentFixture<SupplierPOListComponent>;
  let purchaseOrderService: jasmine.SpyObj<PurchaseOrderService>;
  let capturedArgs: PurchaseOrderResourceParameter[] = [];

  const purchaseOrders: PurchaseOrder[] = [
    { id: 'po1', orderNumber: 'PO-1', poCreatedDate: '2026-01-01T00:00:00Z', paymentStatus: 0, totalAmount: 100 } as unknown as PurchaseOrder,
    { id: 'po2', orderNumber: 'PO-2', poCreatedDate: '2026-01-02T00:00:00Z', paymentStatus: 1, totalAmount: 200 } as unknown as PurchaseOrder,
  ];

  function paginated(header: Record<string, number> = {}): HttpResponse<PurchaseOrder[]> {
    return new HttpResponse({
      body: purchaseOrders,
      headers: new HttpHeaders({
        'X-Pagination': JSON.stringify({ totalCount: 9, pageSize: 5, skip: 0, ...header }),
      }),
    });
  }

  beforeEach(() => {
    capturedArgs = [];
    purchaseOrderService = jasmine.createSpyObj<PurchaseOrderService>('PurchaseOrderService', ['getAllPurchaseOrder']);
    purchaseOrderService.getAllPurchaseOrder.and.callFake((p: PurchaseOrderResourceParameter) => {
      capturedArgs.push({ ...p });
      return of(paginated());
    });
    const securityService = jasmine.createSpyObj('SecurityService', ['hasClaim']);
    (securityService as any).currencyCode = 'USD';

    TestBed.configureTestingModule({
      imports: [SupplierPOListComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        CurrencyPipe,
        { provide: PurchaseOrderService, useValue: purchaseOrderService },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: TranslationService, useValue: { getValue: () => 'TRANSLATED', lanDir$: of('ltr') } },
        { provide: SecurityService, useValue: securityService },
      ],
    });
    fixture = TestBed.createComponent(SupplierPOListComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('supplierId', 'sup-1');
    fixture.detectChanges();
  });

  it('should create and load purchase orders for the supplier', () => {
    expect(component).toBeTruthy();
    expect(capturedArgs.length).toBe(1);
    expect(capturedArgs[0]).toEqual(jasmine.objectContaining({
      supplierId: 'sup-1',
      pageSize: 5,
      orderBy: 'poCreatedDate asc',
    }));
    expect(component.purchaseOrders.length).toBe(2);
    expect(component.purchaseOrderResource.totalCount).toBe(9);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('PO-1');
    expect(text).toContain('PO-2');
  });

  it('paginator page reloads with computed skip and page size', () => {
    component.paginator.nextPage();
    expect(capturedArgs.length).toBe(2);
    expect(capturedArgs[1].skip).toBe(5);
    expect(capturedArgs[1].pageSize).toBe(5);
  });

  it('sort change resets page index and reloads with sort order', () => {
    component.paginator.pageIndex = 4;
    component.sort.active = 'orderNumber';
    component.sort.direction = 'desc';
    component.sort.sortChange.emit({ active: 'orderNumber', direction: 'desc' } as Sort);
    expect(capturedArgs.length).toBe(2);
    expect(capturedArgs[1].orderBy).toBe('orderNumber desc');
    expect(capturedArgs[1].skip).toBe(0);
    expect(component.paginator.pageIndex).toBe(0);
  });
});
