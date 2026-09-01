import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideRouter } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';

import { SaleOrderReturnItemComponent } from './sale-order-return-item.component';
import { SalesOrderService } from '../../sales-order/sales-order.service';
import { CommonService } from '@core/services/common.service';
import { SalesOrder } from '@core/domain-classes/sales-order';
import { SalesOrderItem } from '@core/domain-classes/sales-order-item';

describe('SaleOrderReturnItemComponent', () => {
  let component: SaleOrderReturnItemComponent;
  let fixture: ComponentFixture<SaleOrderReturnItemComponent>;
  let salesOrderService: jasmine.SpyObj<SalesOrderService>;

  const order = { id: 'so-1', orderNumber: 'SO-1' } as SalesOrder;
  const items = [
    { productId: 'p1', productName: 'Coke', quantity: 2 } as SalesOrderItem,
    { productId: 'p2', productName: 'Pepsi', quantity: 1 } as SalesOrderItem,
  ];

  beforeEach(async () => {
    salesOrderService = jasmine.createSpyObj<SalesOrderService>('SalesOrderService', ['getSalesOrderItems']);
    salesOrderService.getSalesOrderItems.and.returnValue(of(items));

    await TestBed.configureTestingModule({
      imports: [SaleOrderReturnItemComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        CurrencyPipe,
        provideNativeDateAdapter(),
        provideHttpClient(),
        { provide: SalesOrderService, useValue: salesOrderService },
        { provide: CommonService, useValue: jasmine.createSpyObj<CommonService>('CommonService', ['getPageHelperText']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SaleOrderReturnItemComponent);
    fixture.componentRef.setInput('salesOrder', order);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads the return items of the bound order on init', () => {
    expect(salesOrderService.getSalesOrderItems).toHaveBeenCalledWith('so-1', true);
    expect(component.salesOrderItems.length).toBe(2);
    expect(component.salesOrderItems[0].productId).toBe('p1');
  });

  it('getDataIndex resolves row positions and isOddDataRow alternates striping', () => {
    expect(component.getDataIndex(items[1])).toBe(1);
    expect(component.isOddDataRow(1)).toBeTrue();
    expect(component.isOddDataRow(0)).toBeFalse();
  });

  it('does not re-fetch when the input changes later (ngOnInit-only fetch)', () => {
    salesOrderService.getSalesOrderItems.calls.reset();
    fixture.componentRef.setInput('salesOrder', {} as SalesOrder);
    fixture.detectChanges();
    expect(salesOrderService.getSalesOrderItems).not.toHaveBeenCalled();
  });
});
