import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { SalesOrderItemsComponent } from './sales-order-items.component';
import { SalesOrderService } from '../../../sales-order/sales-order.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { SalesOrder } from '@core/domain-classes/sales-order';
import { SalesOrderItem } from '@core/domain-classes/sales-order-item';

describe('SalesOrderItemsComponent', () => {
  let component: SalesOrderItemsComponent;
  let fixture: ComponentFixture<SalesOrderItemsComponent>;
  let salesOrderService: jasmine.SpyObj<SalesOrderService>;
  let translationService: jasmine.SpyObj<TranslationService>;

  const items: SalesOrderItem[] = [
    {
      id: 'i1',
      productId: 'p1',
      productName: 'Aspirin',
      unitName: 'Box',
      unitPrice: 10,
      quantity: 2,
      discount: 1,
      taxValue: 2,
      salesOrderItemTaxes: [],
    } as unknown as SalesOrderItem,
    {
      id: 'i2',
      productId: 'p2',
      productName: 'Bandage',
      unitName: 'Pack',
      unitPrice: 5,
      quantity: 3,
      discount: 0,
      taxValue: 1,
      salesOrderItemTaxes: [],
    } as unknown as SalesOrderItem,
  ];

  beforeEach(() => {
    salesOrderService = jasmine.createSpyObj<SalesOrderService>('SalesOrderService', ['getSalesOrderItems']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    const securityService = jasmine.createSpyObj('SecurityService', ['hasClaim']);
    (securityService as any).currencyCode = 'USD';
    securityService.hasClaim.and.returnValue(true);

    TestBed.configureTestingModule({
      imports: [SalesOrderItemsComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        CurrencyPipe,
        { provide: SalesOrderService, useValue: salesOrderService },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'error']) },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
        { provide: SecurityService, useValue: securityService },
      ],
    });
  });

  function create(salesOrder: SalesOrder): void {
    fixture = TestBed.createComponent(SalesOrderItemsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('salesOrder', salesOrder);
    fixture.detectChanges();
  }

  it('should create and load items for the bound sales order', () => {
    salesOrderService.getSalesOrderItems.and.returnValue(of(items));
    create({ id: 'so1' } as SalesOrder);
    expect(component).toBeTruthy();
    expect(salesOrderService.getSalesOrderItems).toHaveBeenCalledOnceWith('so1');
    expect(component.salesOrderItems.length).toBe(2);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('Aspirin');
    expect(text).toContain('Bandage');
  });

  it('reloads items when the salesOrder input changes', () => {
    salesOrderService.getSalesOrderItems.and.returnValues(of([]), of(items));
    create({ id: 'so1' } as SalesOrder);
    fixture.componentRef.setInput('salesOrder', { id: 'so2' } as SalesOrder);
    fixture.detectChanges();
    expect(salesOrderService.getSalesOrderItems).toHaveBeenCalledTimes(2);
    expect(salesOrderService.getSalesOrderItems).toHaveBeenCalledWith('so2');
    expect(component.salesOrderItems.length).toBe(2);
  });

  it('isOddDataRow flags every second index and getDataIndex maps rows to positions', () => {
    salesOrderService.getSalesOrderItems.and.returnValue(of(items));
    create({ id: 'so1' } as SalesOrder);
    expect(component.isOddDataRow(0)).toBeFalse();
    expect(component.isOddDataRow(1)).toBeTrue();
    expect(component.getDataIndex(items[1])).toBe(1);
    expect(component.getDataIndex({} as SalesOrderItem)).toBe(-1);
  });
});
