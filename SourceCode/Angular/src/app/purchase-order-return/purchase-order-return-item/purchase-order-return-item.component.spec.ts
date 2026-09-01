import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { provideHttpClient } from '@angular/common/http';
import { CurrencyPipe } from '@angular/common';
import { provideRouter } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { of } from 'rxjs';

import { PurchaseOrderReturnItemComponent } from './purchase-order-return-item.component';
import { PurchaseOrderService } from '../../purchase-order/purchase-order.service';
import { CommonService } from '@core/services/common.service';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';
import { PurchaseOrderItem } from '@core/domain-classes/purchase-order-item';

describe('PurchaseOrderReturnItemComponent', () => {
  let component: PurchaseOrderReturnItemComponent;
  let fixture: ComponentFixture<PurchaseOrderReturnItemComponent>;
  let purchaseOrderService: jasmine.SpyObj<PurchaseOrderService>;

  const order = { id: 'po-1', orderNumber: 'PO-1' } as PurchaseOrder;
  const items = [
    { productId: 'p1', productName: 'Flour', quantity: 2 } as PurchaseOrderItem,
    { productId: 'p2', productName: 'Sugar', quantity: 1 } as PurchaseOrderItem,
  ];

  beforeEach(async () => {
    purchaseOrderService = jasmine.createSpyObj<PurchaseOrderService>('PurchaseOrderService', ['getPurchaseOrderItems']);
    purchaseOrderService.getPurchaseOrderItems.and.returnValue(of(items));

    await TestBed.configureTestingModule({
      imports: [PurchaseOrderReturnItemComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        CurrencyPipe,
        provideNativeDateAdapter(),
        provideHttpClient(),
        { provide: JwtHelperService, useValue: {} },
        { provide: PurchaseOrderService, useValue: purchaseOrderService },
        { provide: CommonService, useValue: jasmine.createSpyObj<CommonService>('CommonService', ['getPageHelperText']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PurchaseOrderReturnItemComponent);
    fixture.componentRef.setInput('purchaseOrder', order);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads the return items of the bound order on change', () => {
    expect(purchaseOrderService.getPurchaseOrderItems).toHaveBeenCalledWith('po-1', true);
    expect(component.purchaseOrderItems.length).toBe(2);
    expect(component.purchaseOrderItems[1].productId).toBe('p2');
  });

  it('getDataIndex resolves row positions and isOddDataRow alternates striping', () => {
    expect(component.getDataIndex(items[0])).toBe(0);
    expect(component.isOddDataRow(1)).toBeTrue();
    expect(component.isOddDataRow(0)).toBeFalse();
  });

  it('re-fetches when the bound order changes', () => {
    purchaseOrderService.getPurchaseOrderItems.calls.reset();
    purchaseOrderService.getPurchaseOrderItems.and.returnValue(of([]));
    fixture.componentRef.setInput('purchaseOrder', { id: 'po-2' } as PurchaseOrder);
    fixture.detectChanges();
    expect(purchaseOrderService.getPurchaseOrderItems).toHaveBeenCalledWith('po-2', true);
    expect(component.purchaseOrderItems.length).toBe(0);
  });
});
