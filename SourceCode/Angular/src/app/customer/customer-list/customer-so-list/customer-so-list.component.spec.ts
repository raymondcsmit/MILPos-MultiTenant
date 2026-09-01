import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Sort } from '@angular/material/sort';
import { of } from 'rxjs';

import { CustomerSoListComponent } from './customer-so-list.component';
import { SalesOrderService } from '../../../sales-order/sales-order.service';
import { SalesOrderResourceParameter } from '@core/domain-classes/sales-order-resource-parameter';
import { CommonService } from '@core/services/common.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { SalesOrder } from '@core/domain-classes/sales-order';

describe('CustomerSoListComponent', () => {
  let component: CustomerSoListComponent;
  let fixture: ComponentFixture<CustomerSoListComponent>;
  let salesOrderService: jasmine.SpyObj<SalesOrderService>;

  const salesOrders: SalesOrder[] = [
    { id: 'so1', orderNumber: 'SO-1', soCreatedDate: '2026-01-01T00:00:00Z', paymentStatus: 0, totalAmount: 100 } as unknown as SalesOrder,
    { id: 'so2', orderNumber: 'SO-2', soCreatedDate: '2026-01-02T00:00:00Z', paymentStatus: 2, totalAmount: 200 } as unknown as SalesOrder,
  ];

  let capturedArgs: SalesOrderResourceParameter[] = [];

  function paginated(header: Record<string, number> = {}): HttpResponse<SalesOrder[]> {
    return new HttpResponse({
      body: salesOrders,
      headers: new HttpHeaders({
        'X-Pagination': JSON.stringify({ totalCount: 7, pageSize: 5, skip: 0, ...header }),
      }),
    });
  }

  beforeEach(() => {
    capturedArgs = [];
    salesOrderService = jasmine.createSpyObj<SalesOrderService>('SalesOrderService', ['getAllSalesOrder']);
    salesOrderService.getAllSalesOrder.and.callFake((p: SalesOrderResourceParameter) => {
      capturedArgs.push({ ...p });
      return of(paginated());
    });
    const securityService = jasmine.createSpyObj('SecurityService', ['hasClaim']);
    (securityService as any).currencyCode = 'USD';

    TestBed.configureTestingModule({
      imports: [CustomerSoListComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        CurrencyPipe,
        { provide: SalesOrderService, useValue: salesOrderService },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: TranslationService, useValue: { getValue: () => 'TRANSLATED', lanDir$: of('ltr') } },
        { provide: SecurityService, useValue: securityService },
      ],
    });
    fixture = TestBed.createComponent(CustomerSoListComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('customerId', 'cust-1');
    fixture.detectChanges();
  });

  it('should create and load sales orders for the customer', () => {
    expect(component).toBeTruthy();
    expect(salesOrderService.getAllSalesOrder).toHaveBeenCalledWith(jasmine.objectContaining({
      customerId: 'cust-1',
      pageSize: 5,
      orderBy: 'soCreatedDate asc',
    }));
    expect(component.saleOrders.length).toBe(2);
    expect(component.salesOrderResource.totalCount).toBe(7);
    expect(component.salesOrderResource.pageSize).toBe(5);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('SO-1');
    expect(text).toContain('SO-2');
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
