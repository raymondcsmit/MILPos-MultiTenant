import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CurrencyPipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { ManageInventoryComponent } from './manage-inventory.component';
import { InventoryService } from '../inventory.service';
import { ProductService } from '../../product/product.service';
import { UnitConversationService } from '@core/services/unit-conversation.service';
import { TaxService } from '@core/services/tax.service';
import { PurchaseOrderPaymentService } from '../../purchase-order/purchase-order-payment.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { CommonService } from '@core/services/common.service';
import { Product } from '@core/domain-classes/product';
import { Inventory } from '@core/domain-classes/inventory';
import { Brand } from '@core/domain-classes/brand';
import { ProductCategory } from '@core/domain-classes/product-category';
import { UnitConversation } from '@core/domain-classes/unit-conversation';
import { Tax } from '@core/domain-classes/tax';
import { PaymentMethod } from '@core/domain-classes/payment-method';

describe('ManageInventoryComponent', () => {
  let component: ManageInventoryComponent;
  let fixture: ComponentFixture<ManageInventoryComponent>;
  let inventoryService: jasmine.SpyObj<InventoryService>;
  let productService: jasmine.SpyObj<ProductService>;
  let unitConversationService: jasmine.SpyObj<UnitConversationService>;
  let taxService: jasmine.SpyObj<TaxService>;
  let purchaseOrderPaymentService: jasmine.SpyObj<PurchaseOrderPaymentService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialogRef: { close: jasmine.Spy };

  const products: Product[] = [
    { id: 'p1', name: 'Coke', unitId: 'u1' } as unknown as Product,
    { id: 'p2', name: 'Pepsi', unitId: 'u2' } as unknown as Product,
  ];

  const locations = [{ id: 'loc1', name: 'Main' }];
  const dialogData = { inventory: {} as Inventory, locations, selectedLocation: 'loc1' };

  beforeEach(() => {
    dialogRef = { close: jasmine.createSpy('close') };
    inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', ['addInventory']);
    inventoryService.addInventory.and.returnValue(of({} as Inventory));
    productService = jasmine.createSpyObj<ProductService>('ProductService', ['getProductsDropdown']);
    productService.getProductsDropdown.and.returnValue(of(products));
    unitConversationService = jasmine.createSpyObj<UnitConversationService>('UnitConversationService', ['getAll']);
    unitConversationService.getAll.and.returnValue(of([{ id: 'u1', name: 'Pcs' } as UnitConversation]));
    taxService = jasmine.createSpyObj<TaxService>('TaxService', ['getAll']);
    taxService.getAll.and.returnValue(of([{ id: 't1', name: 'GST', percentage: 17 } as Tax]));
    purchaseOrderPaymentService = jasmine.createSpyObj<PurchaseOrderPaymentService>('PurchaseOrderPaymentService', ['getPaymentMethod']);
    purchaseOrderPaymentService.getPaymentMethod.and.returnValue(of([{ id: 1, name: 'CASH' } as PaymentMethod]));
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error', 'warning']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();

    TestBed.configureTestingModule({
      imports: [ManageInventoryComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CurrencyPipe,
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { ...dialogData } },
        { provide: InventoryService, useValue: inventoryService },
        { provide: ProductService, useValue: productService },
        { provide: UnitConversationService, useValue: unitConversationService },
        { provide: TaxService, useValue: taxService },
        { provide: PurchaseOrderPaymentService, useValue: purchaseOrderPaymentService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
      ],
    });
  });

  function create(data?: unknown): void {
    if (data) {
      TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: data });
    }
    fixture = TestBed.createComponent(ManageInventoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function fillValidForm(): void {
    component.inventoryForm.patchValue({
      currentStock: 5,
      productId: 'p1',
      unitId: 'u1',
      pricePerUnit: 10,
      locationId: 'loc1',
      referenceNumber: 'REF-1',
      taxIds: ['t1'],
    });
  }

  it('should create with defaults and load dropdown data', () => {
    create();
    expect(component).toBeTruthy();
    expect(component.inventoryForm.get('type')?.value).toBe('add');
    expect(component.inventoryForm.get('paymentMethod')?.value).toBe(1);
    expect(component.inventoryForm.get('locationId')?.value).toBe('loc1');
    expect(component.products.length).toBe(2);
    expect(component.taxes.length).toBe(1);
    expect(component.paymentMethodslist.length).toBe(1);
    expect(component.unitConversationlist.length).toBe(1);
  });

  it('prefills product and unit from dialog data', fakeAsync(() => {
    create({ inventory: { productId: 'p2', productName: 'Pepsi', unitId: 'u2' }, locations, selectedLocation: 'loc1' });
    tick(600);
    expect(component.inventoryForm.get('filerProduct')?.value).toBe('Pepsi');
    expect(component.inventoryForm.get('productId')?.value).toBe('p2');
    expect(component.inventoryForm.get('unitId')?.value).toBe('u2');
  }));

  it('invalid submit marks touched and skips the service', () => {
    create();
    component.addInventory();
    expect(inventoryService.addInventory).not.toHaveBeenCalled();
    expect(component.inventoryForm.get('currentStock')?.touched).toBeTrue();
  });

  it('valid add submit builds productTaxes and closes with success', () => {
    create();
    fillValidForm();
    component.addInventory();
    expect(inventoryService.addInventory).toHaveBeenCalledWith(jasmine.objectContaining({
      productId: 'p1',
      unitId: 'u1',
      currentStock: 5,
      referenceNumber: 'REF-1',
      productTaxes: [{ taxId: 't1', productId: 'p1' }],
    }));
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('remove operation negates stock and clears productTaxes', () => {
    create();
    fillValidForm();
    component.inventoryForm.get('type')?.setValue('remove');
    component.addInventory();
    expect(inventoryService.addInventory).toHaveBeenCalledWith(jasmine.objectContaining({
      currentStock: -5,
      productTaxes: [],
    }));
  });

  it('onSelectionChange filters unit conversations for the product', () => {
    create();
    component.onSelectionChange('p1');
    expect(component.unitConversationForproduct.length).toBe(1);
    expect(component.unitConversationForproduct[0].id).toBe('u1');
  });

  it('onCancel closes the dialog without saving', () => {
    create();
    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalled();
    expect(inventoryService.addInventory).not.toHaveBeenCalled();
  });
});
