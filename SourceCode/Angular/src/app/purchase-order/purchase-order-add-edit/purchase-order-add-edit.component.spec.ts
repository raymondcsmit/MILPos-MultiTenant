import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';
import { signal } from '@angular/core';
import { BehaviorSubject, of, Subject } from 'rxjs';

import { PurchaseOrderAddEditComponent } from './purchase-order-add-edit.component';
import { SupplierService } from '../../supplier/supplier.service';
import { ProductService } from '../../product/product.service';
import { PurchaseOrderService } from '../purchase-order.service';
import { CommonService } from '@core/services/common.service';
import { PurchaseOrderPaymentService } from '../purchase-order-payment.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { PurchaseOrderStore } from '../purchase-order-store';
import { Operators } from '@core/domain-classes/operator';
import { Product } from '@core/domain-classes/product';
import { Tax } from '@core/domain-classes/tax';
import { UnitConversation } from '@core/domain-classes/unit-conversation';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';
import { PurchaseDeliveryStatusEnum } from '@core/domain-classes/purchase-delivery-status';
import { PurchaseOrderStatusEnum } from '@core/domain-classes/purchase-order-status';

describe('PurchaseOrderAddEditComponent', () => {
  let component: PurchaseOrderAddEditComponent;
  let fixture: ComponentFixture<PurchaseOrderAddEditComponent>;
  let supplierService: jasmine.SpyObj<SupplierService>;
  let productService: jasmine.SpyObj<ProductService>;
  let purchaseOrderService: jasmine.SpyObj<PurchaseOrderService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let paymentService: jasmine.SpyObj<PurchaseOrderPaymentService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let dialog: any;
  let router: Router;
  let routeData$: BehaviorSubject<any>;
  let isAddUpdateSignal: ReturnType<typeof signal<boolean>>;
  let storeStub: any;

  const tax: Tax = { id: 't1', name: 'GST', percentage: 10 } as Tax;
  const taxes: Tax[] = [tax];
  const units: UnitConversation[] = [
    { id: 'u1', name: 'Pc', parentId: null, operator: Operators.Plush, value: '0' },
    { id: 'uc2', name: 'Box', parentId: 'u1', operator: Operators.Plush, value: '5' },
  ] as unknown as UnitConversation[];

  function makeProduct(overrides: Partial<Product> = {}): Product {
    return {
      id: 'p1',
      name: 'Flour',
      unitId: 'u1',
      salesPrice: 100,
      purchasePrice: 80,
      productUrl: '',
      hasVariant: false,
      productTaxes: [{ taxId: 't1', tax: tax }],
      ...overrides,
    } as Product;
  }

  function makeExistingOrder(overrides: any = {}): PurchaseOrder {
    return {
      id: 'po-9',
      orderNumber: 'PO-9',
      supplierId: 's1',
      locationId: 'l1',
      deliveryDate: '2026-08-01T00:00:00Z',
      poCreatedDate: '2026-08-01T10:00:00Z',
      deliveryStatus: PurchaseDeliveryStatusEnum.Pending,
      purchaseOrderItems: [
        {
          productId: 'p1',
          unitId: 'u1',
          unitPrice: 80,
          quantity: 1,
          discount: 0,
          discountType: 'fixed',
          discountPercentage: 0,
          product: makeProduct(),
          purchaseOrderItemTaxes: [{ taxId: 't1', tax: tax, taxValue: 0 }],
        },
      ],
      ...overrides,
    } as unknown as PurchaseOrder;
  }

  beforeEach(async () => {
    routeData$ = new BehaviorSubject<any>({});
    isAddUpdateSignal = signal(false);
    storeStub = {
      isAddUpdate: isAddUpdateSignal,
      isAllowPayment: () => false,
      currentItem: () => null,
      addUpdatePurchaseOrder: jasmine.createSpy('addUpdatePurchaseOrder'),
      loadPurchaseOrderFromReturn: jasmine.createSpy('loadPurchaseOrderFromReturn'),
      resetIsAllowPayment: jasmine.createSpy('resetIsAllowPayment'),
      resetCurrentItem: jasmine.createSpy('resetCurrentItem'),
    };
    supplierService = jasmine.createSpyObj<SupplierService>('SupplierService', ['getSuppliersForDropDown']);
    productService = jasmine.createSpyObj<ProductService>('ProductService', ['getProductsDropdown']);
    purchaseOrderService = jasmine.createSpyObj<PurchaseOrderService>('PurchaseOrderService', ['getNewPurchaseOrderNumber', 'getPurchaseOrderById']);
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getLocationsForCurrentUser', 'getPageHelperText']);
    paymentService = jasmine.createSpyObj<PurchaseOrderPaymentService>('PurchaseOrderPaymentService', ['getPaymentMethod']);
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error', 'warning']);
    const translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new Subject<string>().asObservable();
    const securityService = jasmine.createSpyObj<SecurityService>('SecurityService', ['hasClaim']);
    securityService.currencyCode = 'USD';
    (securityService as any).companyProfile = new Subject<any>().asObservable();

    await TestBed.configureTestingModule({
      imports: [PurchaseOrderAddEditComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        CurrencyPipe,
        provideNativeDateAdapter(),
        { provide: SupplierService, useValue: supplierService },
        { provide: ProductService, useValue: productService },
        { provide: PurchaseOrderService, useValue: purchaseOrderService },
        { provide: CommonService, useValue: commonService },
        { provide: PurchaseOrderPaymentService, useValue: paymentService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: SecurityService, useValue: securityService },
        { provide: PurchaseOrderStore, useValue: storeStub },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: { units: [...units], taxs: [...taxes] } },
            data: routeData$.asObservable(),
            queryParamMap: of({ get: () => null, has: () => false }),
            url: of([]),
            params: of({}),
            paramMap: of({ get: () => null, has: () => false }),
          },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  function create(routeData: any = {}): void {
    supplierService.getSuppliersForDropDown.and.returnValue(of([]));
    purchaseOrderService.getNewPurchaseOrderNumber.and.returnValue(of({ orderNumber: 'PO-100' } as any));
    purchaseOrderService.getPurchaseOrderById.and.returnValue(of(makeExistingOrder()));
    productService.getProductsDropdown.and.returnValue(of([]));
    commonService.getLocationsForCurrentUser.and.returnValue(of({ locations: [{ id: 'l1', name: 'Main' }], selectedLocation: 'l1' } as any));
    paymentService.getPaymentMethod.and.returnValue(of([{ id: 1 }] as any));
    fixture = TestBed.createComponent(PurchaseOrderAddEditComponent);
    component = fixture.componentInstance;
    dialog = (component as any).dialog;
    spyOn(dialog, 'open').and.returnValue({ afterClosed: () => of(false) } as any);
    routeData$.next(routeData);
    fixture.detectChanges();
    tick(1100);
  }

  it('new order builds the form, fetches the next order number and defaults Pending', fakeAsync(() => {
    create();
    expect(component.purchaseOrderForm).toBeTruthy();
    expect(component.purchaseOrderForm.get('orderNumber')?.value).toBe('PO-100');
    expect(component.purchaseOrderForm.get('deliveryStatus')?.value).toBe(PurchaseDeliveryStatusEnum.Pending);
    expect(component.isEdit).toBeFalse();
  }));

  it('new order loads payment methods and locations', fakeAsync(() => {
    create();
    expect(component.paymentMethodslist.length).toBe(1);
    expect(component.locations.length).toBe(1);
    expect(component.purchaseOrderForm.get('locationId')?.value).toBe('l1');
  }));

  it('edit mode patches the order, disables location input and patches items', fakeAsync(() => {
    create({ purchaseorder: makeExistingOrder() });
    expect(component.isEdit).toBeTrue();
    expect(component.purchaseOrderForm.get('orderNumber')?.value).toBe('PO-9');
    expect(component.purchaseOrderForm.get('locationId')?.disabled).toBeTrue();
    expect(component.purchaseOrderItemsArray.length).toBe(1);
    expect(component.purchaseOrderItemsArray.at(0).get('unitPrice')?.value).toBe(80);
  }));

  it('onProductSelection adds a row priced from purchasePrice and clears the product control', fakeAsync(() => {
    create();
    component.productNameControl.setValue('Flour');
    component.onProductSelection(makeProduct());
    expect(component.purchaseOrderItemsArray.length).toBe(1);
    const item = component.purchaseOrderItemsArray.at(0);
    expect(item.get('productId')?.value).toBe('p1');
    expect(item.get('unitPrice')?.value).toBe(80);
    expect(item.get('purchasePrice')?.value).toBe(80);
    expect(item.get('taxIds')?.value).toEqual(['t1']);
    expect(item.get('taxPercentage')?.value).toBe(10);
    expect(component.productNameControl.value).toBe('');
  }));

  it('onProductSelection for an existing product increments quantity', fakeAsync(() => {
    create();
    component.onProductSelection(makeProduct());
    component.onProductSelection(makeProduct());
    expect(component.purchaseOrderItemsArray.length).toBe(1);
    expect(component.purchaseOrderItemsArray.at(0).get('quantity')?.value).toBe(2);
  }));

  it('onProductSelection for a variant product adds every variant child', fakeAsync(() => {
    create();
    productService.getProductsDropdown.calls.reset();
    productService.getProductsDropdown.and.returnValue(of([makeProduct({ id: 'vc1', name: 'S' }), makeProduct({ id: 'vc2', name: 'L' })]));
    component.onProductSelection(makeProduct({ id: 'vp', hasVariant: true }));
    expect(productService.getProductsDropdown).toHaveBeenCalledWith(jasmine.objectContaining({ parentId: 'vp' }));
    expect(component.purchaseOrderItemsArray.length).toBe(2);
  }));

  it('getAllTotal computes totals with round-off', fakeAsync(() => {
    create();
    component.onProductSelection(makeProduct());
    component.purchaseOrderItemsArray.at(0).patchValue({ quantity: 2, discountPercentage: 5 });
    component.getAllTotal();
    expect(component.totalBeforeDiscount).toBe(160);
    expect(component.totalTax).toBe(15.5);
    expect(component.totalDiscount).toBe(5);
    // (160 - 5) * 1.1 = 170.5 -> floor 170 with 0.5 round-off
    expect(component.grandTotal).toBe(170);
    expect(component.totalRoundOff).toBe(0.5);
    expect(component.purchaseOrderItemsArray.at(0).get('total')?.value).toBe(171);
  }));

  it('onTotalChange back-computes the unit price from the entered total', fakeAsync(() => {
    create();
    component.onProductSelection(makeProduct());
    const item = component.purchaseOrderItemsArray.at(0);
    item.patchValue({ taxPercentage: 10, quantity: 2, discountPercentage: 0, total: '176' });
    component.onTotalChange(0);
    expect(item.get('unitPrice')?.value).toBe(80);
  }));

  it('onDiscountTypeChange resets a non-zero discount and recalculates', fakeAsync(() => {
    create();
    component.onProductSelection(makeProduct());
    const item = component.purchaseOrderItemsArray.at(0);
    item.patchValue({ quantity: 2, discountPercentage: 5 });
    component.onDiscountTypeChange(0);
    expect(item.get('discountPercentage')?.value).toBe(0);
  }));

  it('onUnitSelectionChange with plus operator adjusts the unit price', fakeAsync(() => {
    create();
    component.onProductSelection(makeProduct());
    component.onUnitSelectionChange('uc2', 0);
    expect(component.purchaseOrderItemsArray.at(0).get('unitPrice')?.value).toBe(85);
  }));

  it('onUnitSelectionChange with unknown unit falls back to purchase price and patches unit', fakeAsync(() => {
    create();
    component.onProductSelection(makeProduct());
    component.onUnitSelectionChange('nope', 0);
    const item = component.purchaseOrderItemsArray.at(0);
    expect(item.get('unitPrice')?.value).toBe(80);
    expect(item.get('unitId')?.value).toBe('nope');
  }));

  it('onRemovePurchaseOrderItem removes the row and recomputes', fakeAsync(() => {
    create();
    component.onProductSelection(makeProduct());
    component.onProductSelection(makeProduct({ id: 'p2', name: 'Sugar' }));
    component.onRemovePurchaseOrderItem(0);
    expect(component.purchaseOrderItemsArray.length).toBe(1);
    expect(component.purchaseOrderItemsArray.at(0).get('productId')?.value).toBe('p2');
  }));

  it('barcode exact match adds the product and clears the control', fakeAsync(() => {
    create();
    productService.getProductsDropdown.calls.reset();
    productService.getProductsDropdown.and.returnValue(of([makeProduct()]));
    component.barCodeNameControl.setValue('123456');
    tick(600);
    expect(component.purchaseOrderItemsArray.length).toBe(1);
    expect(component.barCodeNameControl.value).toBe('');
  }));

  it('barcode miss warns product-not-found', fakeAsync(() => {
    create();
    productService.getProductsDropdown.calls.reset();
    productService.getProductsDropdown.and.returnValue(of([]));
    component.barCodeNameControl.setValue('nope');
    tick(600);
    expect(toastrService.warning).toHaveBeenCalled();
    expect(component.purchaseOrderItemsArray.length).toBe(0);
  }));

  it('product name control emits a debounced dropdown query with page size 10', fakeAsync(() => {
    create();
    productService.getProductsDropdown.calls.reset();
    productService.getProductsDropdown.and.returnValue(of([makeProduct()]));
    let emitted: Product[] = [];
    component.productList$.subscribe((p) => (emitted = p));
    component.productNameControl.setValue('Flour');
    tick(1100);
    const resource = productService.getProductsDropdown.calls.mostRecent().args[0];
    expect(resource.name).toBe('Flour');
    expect(resource.pageSize).toBe(10);
    expect(emitted.length).toBe(1);
  }));

  it('supplier name control searches suppliers after debounce', fakeAsync(() => {
    create();
    supplierService.getSuppliersForDropDown.calls.reset();
    supplierService.getSuppliersForDropDown.and.returnValue(of([{ id: 's1', supplierName: 'Sup' } as any]));
    component.supplierNameControl.setValue('Sup');
    tick(600);
    expect(supplierService.getSuppliersForDropDown).toHaveBeenCalledWith('Sup', '');
    expect(component.suppliers.length).toBe(1);
  }));

  it('invalid submit marks all controls touched and never saves', fakeAsync(() => {
    create();
    component.onPurchaseOrderSubmit();
    expect(component.purchaseOrderForm.touched).toBeTrue();
    expect(storeStub.addUpdatePurchaseOrder).not.toHaveBeenCalled();
  }));

  it('valid submit without items errors please-select-at-least-one-product', fakeAsync(() => {
    create();
    component.purchaseOrderForm.patchValue({ supplierId: 's1', locationId: 'l1' });
    component.onPurchaseOrderSubmit();
    expect(toastrService.error).toHaveBeenCalled();
    expect(storeStub.addUpdatePurchaseOrder).not.toHaveBeenCalled();
  }));

  it('returned purchase orders cannot be edited', fakeAsync(() => {
    create({ purchaseorder: makeExistingOrder({ purchaseOrderStatus: PurchaseOrderStatusEnum.Return }) });
    component.onPurchaseOrderSubmit();
    expect(toastrService.error).toHaveBeenCalled();
    expect(storeStub.addUpdatePurchaseOrder).not.toHaveBeenCalled();
  }));

  it('new order submit saves through the store with built items', fakeAsync(() => {
    create();
    component.purchaseOrderForm.patchValue({ supplierId: 's1', locationId: 'l1' });
    component.onProductSelection(makeProduct());
    component.purchaseOrderItemsArray.at(0).patchValue({ quantity: 2, discountPercentage: 5 });
    component.getAllTotal();
    storeStub.addUpdatePurchaseOrder.calls.reset();
    component.onPurchaseOrderSubmit();
    expect(storeStub.addUpdatePurchaseOrder).toHaveBeenCalledTimes(1);
    const saved = storeStub.addUpdatePurchaseOrder.calls.mostRecent().args[0] as PurchaseOrder;
    expect(saved.id).toBe('');
    expect(saved.isAllowPayment).toBeFalse();
    expect(saved.totalAmount).toBe(170);
    expect(saved.totalTax).toBe(15.5);
    expect(saved.totalDiscount).toBe(5);
    const item = saved.purchaseOrderItems[0];
    expect(item.discount).toBe(5);
    expect(item.taxValue).toBe(15.5);
    expect(item.purchaseOrderItemTaxes[0].taxId).toBe('t1');
    // per-tax rows are NOT parseFloat'ed — raw pipe string
    expect(item.purchaseOrderItemTaxes[0].taxValue as unknown).toBe('15.50');
  }));

  it('edit submit keeps the existing id', fakeAsync(() => {
    create({ purchaseorder: makeExistingOrder() });
    component.onPurchaseOrderSubmit();
    const saved = storeStub.addUpdatePurchaseOrder.calls.mostRecent().args[0] as PurchaseOrder;
    expect(saved.id).toBe('po-9');
  }));

  it('store add/update completion with payment disabled navigates to the list', fakeAsync(() => {
    create();
    isAddUpdateSignal.set(true);
    fixture.detectChanges();
    flush();
    expect(router.navigate).toHaveBeenCalledWith(['/purchase-order/list']);
  }));

  it('store add/update completion with payment enabled opens the payment dialog then resets', fakeAsync(() => {
    create();
    storeStub.isAllowPayment = () => true;
    component.grandTotal = 500;
    dialog.open.and.returnValue({ afterClosed: () => of(false) } as any);
    isAddUpdateSignal.set(true);
    fixture.detectChanges();
    flush();
    expect(dialog.open).toHaveBeenCalled();
    expect(storeStub.resetIsAllowPayment).toHaveBeenCalled();
    expect(storeStub.resetCurrentItem).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/purchase-order/list']);
  }));

  it('addNewSupplier pushes the dialog result and selects it', fakeAsync(() => {
    create();
    const newSupplier = { id: 's9', supplierName: 'New Sup' };
    dialog.open.and.returnValue({ afterClosed: () => of(newSupplier) } as any);
    component.addNewSupplier();
    expect(dialog.open).toHaveBeenCalled();
    expect(component.suppliers.find((s) => s.id === 's9')).toBeTruthy();
    expect(component.purchaseOrderForm.get('supplierId')?.value).toBe('s9');
  }));

  it('addNewSupplier with a dismissed dialog does nothing', fakeAsync(() => {
    create();
    component.addNewSupplier();
    expect(component.suppliers.find((s) => s.id === 's9')).toBeUndefined();
  }));

  it('getPurchaseOrderRequestById hydrates the form, items and suppliers from a request order', fakeAsync(() => {
    create();
    supplierService.getSuppliersForDropDown.calls.reset();
    supplierService.getSuppliersForDropDown.and.returnValue(of([{ id: 's1' } as any]));
    component.getPurchaseOrderRequestById('pr-1');
    expect(purchaseOrderService.getPurchaseOrderById).toHaveBeenCalledWith('pr-1');
    expect(component.purchaseOrderForm.get('supplierId')?.value).toBe('s1');
    expect(component.purchaseOrderItemsArray.length).toBe(1);
    expect(component.purchaseOrderItemsArray.at(0).get('productId')?.value).toBe('p1');
    expect(supplierService.getSuppliersForDropDown).toHaveBeenCalledWith('', 's1');
  }));

  it('convertFromPurchaseRequest hydrates from the dialog-selected request id', fakeAsync(() => {
    create();
    dialog.open.and.returnValue({ afterClosed: () => of('pr-2') } as any);
    component.convertFromPurchaseRequest();
    expect(purchaseOrderService.getPurchaseOrderById).toHaveBeenCalledWith('pr-2');
    expect(component.purchaseOrderItemsArray.length).toBe(1);
  }));
});
