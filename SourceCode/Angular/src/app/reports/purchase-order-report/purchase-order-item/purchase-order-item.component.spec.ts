import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { PurchaseOrderItemComponent } from './purchase-order-item.component';
import { PurchaseOrderService } from '../../../purchase-order/purchase-order.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';
import { PurchaseOrderItem } from '@core/domain-classes/purchase-order-item';

describe('PurchaseOrderItemComponent', () => {
  let component: PurchaseOrderItemComponent;
  let fixture: ComponentFixture<PurchaseOrderItemComponent>;
  let purchaseOrderService: jasmine.SpyObj<PurchaseOrderService>;
  let translationService: jasmine.SpyObj<TranslationService>;

  const items: PurchaseOrderItem[] = [
    {
      id: 'i1',
      productId: 'p1',
      productName: 'Paracetamol',
      unitName: 'Box',
      unitPrice: 8,
      quantity: 4,
      discount: 2,
      taxValue: 3,
      purchaseOrderItemTaxes: [],
    } as unknown as PurchaseOrderItem,
    {
      id: 'i2',
      productId: 'p2',
      productName: 'Syringe',
      unitName: 'Pack',
      unitPrice: 1,
      quantity: 50,
      discount: 0,
      taxValue: 0,
      purchaseOrderItemTaxes: [],
    } as unknown as PurchaseOrderItem,
  ];

  beforeEach(() => {
    purchaseOrderService = jasmine.createSpyObj<PurchaseOrderService>('PurchaseOrderService', ['getPurchaseOrderItems']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    const securityService = jasmine.createSpyObj('SecurityService', ['hasClaim']);
    (securityService as any).currencyCode = 'USD';
    securityService.hasClaim.and.returnValue(true);

    TestBed.configureTestingModule({
      imports: [PurchaseOrderItemComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        CurrencyPipe,
        { provide: PurchaseOrderService, useValue: purchaseOrderService },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'error']) },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
        { provide: SecurityService, useValue: securityService },
      ],
    });
  });

  function create(purchaseOrder: PurchaseOrder): void {
    fixture = TestBed.createComponent(PurchaseOrderItemComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('purchaseOrder', purchaseOrder);
    fixture.detectChanges();
  }

  it('should create and load items for the bound purchase order', () => {
    purchaseOrderService.getPurchaseOrderItems.and.returnValue(of(items));
    create({ id: 'po1' } as PurchaseOrder);
    expect(component).toBeTruthy();
    expect(purchaseOrderService.getPurchaseOrderItems).toHaveBeenCalledOnceWith('po1');
    expect(component.purchaseOrderItems.length).toBe(2);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('Paracetamol');
    expect(text).toContain('Syringe');
  });

  it('reloads items when the purchaseOrder input changes', () => {
    purchaseOrderService.getPurchaseOrderItems.and.returnValues(of([]), of(items));
    create({ id: 'po1' } as PurchaseOrder);
    fixture.componentRef.setInput('purchaseOrder', { id: 'po2' } as PurchaseOrder);
    fixture.detectChanges();
    expect(purchaseOrderService.getPurchaseOrderItems).toHaveBeenCalledTimes(2);
    expect(purchaseOrderService.getPurchaseOrderItems).toHaveBeenCalledWith('po2');
    expect(component.purchaseOrderItems.length).toBe(2);
  });

  it('isOddDataRow flags every second index and getDataIndex maps rows to positions', () => {
    purchaseOrderService.getPurchaseOrderItems.and.returnValue(of(items));
    create({ id: 'po1' } as PurchaseOrder);
    expect(component.isOddDataRow(0)).toBeFalse();
    expect(component.isOddDataRow(1)).toBeTrue();
    expect(component.getDataIndex(items[1])).toBe(1);
    expect(component.getDataIndex({} as PurchaseOrderItem)).toBe(-1);
  });
});
