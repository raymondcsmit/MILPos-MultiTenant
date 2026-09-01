import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { BehaviorSubject, of } from 'rxjs';

import { PurchaseOrderRequestItemsComponent } from './purchase-order-request-items.component';
import { PurchaseOrderService } from '../../../purchase-order/purchase-order.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { CommonService } from '@core/services/common.service';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';
import { PurchaseOrderItem } from '@core/domain-classes/purchase-order-item';

describe('PurchaseOrderRequestItemsComponent', () => {
  let component: PurchaseOrderRequestItemsComponent;
  let fixture: ComponentFixture<PurchaseOrderRequestItemsComponent>;
  let purchaseOrderService: jasmine.SpyObj<PurchaseOrderService>;

  const order = { id: 'r1', orderNumber: 'POR-1' } as unknown as PurchaseOrder;

  const items: PurchaseOrderItem[] = [
    { id: 'i1', productName: 'Pulp', quantity: 3, unitPrice: 20, discount: 0, taxValue: 0, unitName: 'Bag' } as unknown as PurchaseOrderItem,
    { id: 'i2', productName: 'Bottle', quantity: 1, unitPrice: 30, discount: 0, taxValue: 0, unitName: 'Piece' } as unknown as PurchaseOrderItem,
  ];

  beforeEach(async () => {
    purchaseOrderService = jasmine.createSpyObj<PurchaseOrderService>('PurchaseOrderService', ['getPurchaseOrderItems']);

    await TestBed.configureTestingModule({
      imports: [PurchaseOrderRequestItemsComponent, TranslateModule.forRoot()],
      providers: [
        CurrencyPipe,
        { provide: PurchaseOrderService, useValue: purchaseOrderService },
        { provide: TranslationService, useValue: Object.assign(jasmine.createSpyObj('TranslationService', ['getValue']), { lanDir$: new BehaviorSubject<string>('ltr').asObservable() }) },
        { provide: SecurityService, useValue: Object.assign(jasmine.createSpyObj('SecurityService', ['hasClaim']), { currencyCode: 'USD' }) },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
      ],
    }).compileComponents();
  });

  it('should create without loading items (loads on input change)', () => {
    fixture = TestBed.createComponent(PurchaseOrderRequestItemsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(purchaseOrderService.getPurchaseOrderItems).not.toHaveBeenCalled();
  });

  it('purchaseOrder input change loads items by request id', () => {
    purchaseOrderService.getPurchaseOrderItems.and.returnValue(of(items));
    fixture = TestBed.createComponent(PurchaseOrderRequestItemsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('purchaseOrder', order);
    fixture.detectChanges();
    expect(purchaseOrderService.getPurchaseOrderItems).toHaveBeenCalledWith('r1');
    expect(component.purchaseOrderItems.length).toBe(2);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('Pulp');
    expect(text).toContain('Bottle');
  });

  it('rebinding a different request reloads its items', () => {
    purchaseOrderService.getPurchaseOrderItems.and.returnValues(of([items[0]]), of([items[1]]));
    fixture = TestBed.createComponent(PurchaseOrderRequestItemsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('purchaseOrder', order);
    fixture.detectChanges();
    fixture.componentRef.setInput('purchaseOrder', { id: 'r2' } as PurchaseOrder);
    fixture.detectChanges();
    expect(purchaseOrderService.getPurchaseOrderItems).toHaveBeenCalledWith('r2');
    expect(component.purchaseOrderItems.length).toBe(1);
  });

  it('renders computed totals per row', () => {
    purchaseOrderService.getPurchaseOrderItems.and.returnValue(of(items));
    fixture = TestBed.createComponent(PurchaseOrderRequestItemsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('purchaseOrder', order);
    fixture.detectChanges();
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('$60.00');
    expect(text).toContain('$30.00');
  });

  it('getDataIndex and isOddDataRow resolve row positions', () => {
    purchaseOrderService.getPurchaseOrderItems.and.returnValue(of(items));
    fixture = TestBed.createComponent(PurchaseOrderRequestItemsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('purchaseOrder', order);
    fixture.detectChanges();
    expect(component.getDataIndex(items[1])).toBe(1);
    expect(component.isOddDataRow(1)).toBeTrue();
    expect(component.isOddDataRow(0)).toBeFalse();
  });
});
