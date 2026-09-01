import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { BehaviorSubject, of } from 'rxjs';

import { SalesOrderItemsComponent } from './sales-order-items.component';
import { SalesOrderService } from '../../sales-order.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { CommonService } from '@core/services/common.service';
import { SalesOrder } from '@core/domain-classes/sales-order';
import { SalesOrderItem } from '@core/domain-classes/sales-order-item';

describe('SalesOrderItemsComponent', () => {
  let component: SalesOrderItemsComponent;
  let fixture: ComponentFixture<SalesOrderItemsComponent>;
  let salesOrderService: jasmine.SpyObj<SalesOrderService>;

  const order = { id: 'so1', orderNumber: 'SO-1' } as unknown as SalesOrder;

  const items: SalesOrderItem[] = [
    { id: 'i1', productName: 'Coke', quantity: 2, unitPrice: 10, discount: 0, taxValue: 0, totalAmount: 20, unitName: 'Box' } as unknown as SalesOrderItem,
    { id: 'i2', productName: 'Pepsi', quantity: 1, unitPrice: 15, discount: 0, taxValue: 0, totalAmount: 15, unitName: 'Can' } as unknown as SalesOrderItem,
  ];

  beforeEach(async () => {
    salesOrderService = jasmine.createSpyObj<SalesOrderService>('SalesOrderService', ['getSalesOrderItems']);

    await TestBed.configureTestingModule({
      imports: [SalesOrderItemsComponent, TranslateModule.forRoot()],
      providers: [
        CurrencyPipe,
        { provide: SalesOrderService, useValue: salesOrderService },
        { provide: TranslationService, useValue: Object.assign(jasmine.createSpyObj('TranslationService', ['getValue']), { lanDir$: new BehaviorSubject<string>('ltr').asObservable() }) },
        { provide: SecurityService, useValue: Object.assign(jasmine.createSpyObj('SecurityService', ['hasClaim']), { currencyCode: 'USD' }) },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
      ],
    }).compileComponents();
  });

  it('should create and load items by sales order id', () => {
    salesOrderService.getSalesOrderItems.and.returnValue(of(items));
    fixture = TestBed.createComponent(SalesOrderItemsComponent);
    fixture.componentRef.setInput('salesOrder', order);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(salesOrderService.getSalesOrderItems).toHaveBeenCalledWith('so1');
    expect(component.salesOrderItems.length).toBe(2);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('Coke');
    expect(text).toContain('Pepsi');
  });

  it('missing order id falls back to empty string id', () => {
    salesOrderService.getSalesOrderItems.and.returnValue(of([]));
    fixture = TestBed.createComponent(SalesOrderItemsComponent);
    fixture.componentRef.setInput('salesOrder', {} as SalesOrder);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(salesOrderService.getSalesOrderItems).toHaveBeenCalledWith('');
    expect(component.salesOrderItems.length).toBe(0);
  });

  it('renders currency for item amounts', () => {
    salesOrderService.getSalesOrderItems.and.returnValue(of(items));
    fixture = TestBed.createComponent(SalesOrderItemsComponent);
    fixture.componentRef.setInput('salesOrder', order);
    component = fixture.componentInstance;
    fixture.detectChanges();
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('$20.00');
    expect(text).toContain('$15.00');
  });

  it('getDataIndex and isOddDataRow resolve row positions', () => {
    salesOrderService.getSalesOrderItems.and.returnValue(of(items));
    fixture = TestBed.createComponent(SalesOrderItemsComponent);
    fixture.componentRef.setInput('salesOrder', order);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.getDataIndex(items[1])).toBe(1);
    expect(component.isOddDataRow(1)).toBeTrue();
    expect(component.isOddDataRow(0)).toBeFalse();
  });
});
