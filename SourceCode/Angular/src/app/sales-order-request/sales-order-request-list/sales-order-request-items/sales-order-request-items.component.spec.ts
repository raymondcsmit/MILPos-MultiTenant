import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { BehaviorSubject, of } from 'rxjs';

import { SalesOrderRequestItemsComponent } from './sales-order-request-items.component';
import { SalesOrderService } from '../../../sales-order/sales-order.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { CommonService } from '@core/services/common.service';
import { SalesOrder } from '@core/domain-classes/sales-order';
import { SalesOrderItem } from '@core/domain-classes/sales-order-item';

describe('SalesOrderRequestItemsComponent', () => {
  let component: SalesOrderRequestItemsComponent;
  let fixture: ComponentFixture<SalesOrderRequestItemsComponent>;
  let salesOrderService: jasmine.SpyObj<SalesOrderService>;

  const order = { id: 'r1', orderNumber: 'SOR-1' } as unknown as SalesOrder;

  const items: SalesOrderItem[] = [
    { id: 'i1', productName: 'Coke', quantity: 2, unitPrice: 10, discount: 0, taxValue: 0, unitName: 'Box' } as unknown as SalesOrderItem,
    { id: 'i2', productName: 'Pepsi', quantity: 1, unitPrice: 15, discount: 0, taxValue: 0, unitName: 'Can' } as unknown as SalesOrderItem,
  ];

  beforeEach(async () => {
    salesOrderService = jasmine.createSpyObj<SalesOrderService>('SalesOrderService', ['getSalesOrderItems']);

    await TestBed.configureTestingModule({
      imports: [SalesOrderRequestItemsComponent, TranslateModule.forRoot()],
      providers: [
        CurrencyPipe,
        { provide: SalesOrderService, useValue: salesOrderService },
        { provide: TranslationService, useValue: Object.assign(jasmine.createSpyObj('TranslationService', ['getValue']), { lanDir$: new BehaviorSubject<string>('ltr').asObservable() }) },
        { provide: SecurityService, useValue: Object.assign(jasmine.createSpyObj('SecurityService', ['hasClaim']), { currencyCode: 'USD' }) },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
      ],
    }).compileComponents();
  });

  it('should create without loading items (loads on input change)', () => {
    fixture = TestBed.createComponent(SalesOrderRequestItemsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(salesOrderService.getSalesOrderItems).not.toHaveBeenCalled();
  });

  it('salesOrder input change loads items by order id', () => {
    salesOrderService.getSalesOrderItems.and.returnValue(of(items));
    fixture = TestBed.createComponent(SalesOrderRequestItemsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('salesOrder', order);
    fixture.detectChanges();
    expect(salesOrderService.getSalesOrderItems).toHaveBeenCalledWith('r1');
    expect(component.salesOrderItems.length).toBe(2);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('Coke');
    expect(text).toContain('Pepsi');
  });

  it('rebinding a different order reloads its items', () => {
    salesOrderService.getSalesOrderItems.and.returnValues(of([items[0]]), of([items[1]]));
    fixture = TestBed.createComponent(SalesOrderRequestItemsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('salesOrder', order);
    fixture.detectChanges();
    fixture.componentRef.setInput('salesOrder', { id: 'r2' } as SalesOrder);
    fixture.detectChanges();
    expect(salesOrderService.getSalesOrderItems).toHaveBeenCalledWith('r2');
    expect(component.salesOrderItems.length).toBe(1);
  });

  it('renders computed totals per row', () => {
    salesOrderService.getSalesOrderItems.and.returnValue(of(items));
    fixture = TestBed.createComponent(SalesOrderRequestItemsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('salesOrder', order);
    fixture.detectChanges();
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('$20.00');
    expect(text).toContain('$15.00');
  });

  it('getDataIndex and isOddDataRow resolve row positions', () => {
    salesOrderService.getSalesOrderItems.and.returnValue(of(items));
    fixture = TestBed.createComponent(SalesOrderRequestItemsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('salesOrder', order);
    fixture.detectChanges();
    expect(component.getDataIndex(items[1])).toBe(1);
    expect(component.isOddDataRow(1)).toBeTrue();
    expect(component.isOddDataRow(0)).toBeFalse();
  });
});
