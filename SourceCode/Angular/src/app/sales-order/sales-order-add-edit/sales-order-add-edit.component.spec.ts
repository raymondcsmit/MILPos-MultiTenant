import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';
import { signal } from '@angular/core';
import { BehaviorSubject, of, Subject } from 'rxjs';

import { SalesOrderAddEditComponent } from './sales-order-add-edit.component';
import { CustomerService } from '../../customer/customer.service';
import { ProductService } from '../../product/product.service';
import { SalesOrderService } from '../sales-order.service';
import { CommonService } from '@core/services/common.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { SalesOrderStore } from '../sales-order-store';
import { Operators } from '@core/domain-classes/operator';
import { Product } from '@core/domain-classes/product';
import { Tax } from '@core/domain-classes/tax';
import { UnitConversation } from '@core/domain-classes/unit-conversation';
import { SalesOrder } from '@core/domain-classes/sales-order';
import { SalesDeliveryStatusEnum } from '@core/domain-classes/sales-delivery-statu';
import { SalesOrderStatusEnum } from '@core/domain-classes/sales-order-status';

describe('SalesOrderAddEditComponent', () => {
  let component: SalesOrderAddEditComponent;
  let fixture: ComponentFixture<SalesOrderAddEditComponent>;
  let customerService: jasmine.SpyObj<CustomerService>;
  let productService: jasmine.SpyObj<ProductService>;
  let salesOrderService: jasmine.SpyObj<SalesOrderService>;
  let commonService: jasmine.SpyObj<CommonService>;
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
      name: 'Coke',
      unitId: 'u1',
      salesPrice: 100,
      productUrl: '',
      hasVariant: false,
      productTaxes: [{ taxId: 't1', tax: tax }],
      ...overrides,
    } as Product;
  }

  function makeExistingOrder(overrides: any = {}): SalesOrder {
    return {
      id: 'so-9',
      orderNumber: 'SO-9',
      customerId: 'c1',
      locationId: 'l1',
      deliveryDate: '2026-08-01T00:00:00Z',
      soCreatedDate: '2026-08-01T10:00:00Z',
      deliveryStatus: SalesDeliveryStatusEnum.Pending,
      flatDiscount: 0,
      salesOrderItems: [
        {
          productId: 'p1',
          unitId: 'u1',
          unitPrice: 100,
          quantity: 1,
          discount: 0,
          discountType: 'fixed',
          discountPercentage: 0,
          product: makeProduct(),
          salesOrderItemTaxes: [{ taxId: 't1', tax: tax, taxValue: 0 }],
        },
      ],
      ...overrides,
    } as unknown as SalesOrder;
  }

  beforeEach(async () => {
    routeData$ = new BehaviorSubject<any>({});
    isAddUpdateSignal = signal(false);
    storeStub = {
      isAddUpdate: isAddUpdateSignal,
      isAllowPayment: () => false,
      currentItem: () => null,
      addUpdateSalesOrder: jasmine.createSpy('addUpdateSalesOrder'),
      loadSalesOrderFromReturn: jasmine.createSpy('loadSalesOrderFromReturn'),
      resetIsAllowPayment: jasmine.createSpy('resetIsAllowPayment'),
      resetCurrentItem: jasmine.createSpy('resetCurrentItem'),
    };
    customerService = jasmine.createSpyObj<CustomerService>('CustomerService', ['getCustomersForDropDown']);
    productService = jasmine.createSpyObj<ProductService>('ProductService', ['getProductsDropdown', 'getProductsInventory']);
    salesOrderService = jasmine.createSpyObj<SalesOrderService>('SalesOrderService', ['getNewSalesOrderNumber', 'getSalesOrderById']);
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getLocationsForCurrentUser', 'getPageHelperText']);
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error', 'warning']);
    const translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new Subject<string>().asObservable();
    const securityService = jasmine.createSpyObj<SecurityService>('SecurityService', ['hasClaim']);
    securityService.currencyCode = 'USD';
    (securityService as any).companyProfile = new Subject<any>().asObservable();

    await TestBed.configureTestingModule({
      imports: [SalesOrderAddEditComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        CurrencyPipe,
        provideNativeDateAdapter(),
        { provide: CustomerService, useValue: customerService },
        { provide: ProductService, useValue: productService },
        { provide: SalesOrderService, useValue: salesOrderService },
        { provide: CommonService, useValue: commonService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: SecurityService, useValue: securityService },
        { provide: SalesOrderStore, useValue: storeStub },
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
    customerService.getCustomersForDropDown.and.returnValue(of([]));
    salesOrderService.getNewSalesOrderNumber.and.returnValue(of({ orderNumber: 'SO-100' } as any));
    salesOrderService.getSalesOrderById.and.returnValue(of(makeExistingOrder()));
    productService.getProductsDropdown.and.returnValue(of([]));
    productService.getProductsInventory.and.returnValue(of([]));
    commonService.getLocationsForCurrentUser.and.returnValue(of({ locations: [{ id: 'l1', name: 'Main' }], selectedLocation: 'l1' } as any));
    fixture = TestBed.createComponent(SalesOrderAddEditComponent);
    component = fixture.componentInstance;
    dialog = (component as any).dialog;
    spyOn(dialog, 'open').and.returnValue({ afterClosed: () => of(false) } as any);
    routeData$.next(routeData);
    fixture.detectChanges();
    tick(1100);
  }

  it('new order builds the form, fetches the next order number and defaults Pending', fakeAsync(() => {
    create();
    expect(component.salesOrderForm).toBeTruthy();
    expect(component.salesOrderForm.get('orderNumber')?.value).toBe('SO-100');
    expect(component.salesOrderForm.get('deliveryStatus')?.value).toBe(SalesDeliveryStatusEnum.Pending);
    expect(component.isEdit).toBeFalse();
  }));

  it('new order loads locations and patches the selected location', fakeAsync(() => {
    create();
    expect(component.locations.length).toBe(1);
    expect(component.salesOrderForm.get('locationId')?.value).toBe('l1');
  }));

  it('edit mode patches the order, disables order/location inputs and patches items', fakeAsync(() => {
    create({ salesorder: makeExistingOrder() });
    expect(component.isEdit).toBeTrue();
    expect(component.salesOrderForm.get('orderNumber')?.value).toBe('SO-9');
    expect(component.salesOrderForm.get('orderNumber')?.disabled).toBeTrue();
    expect(component.salesOrderForm.get('locationId')?.disabled).toBeTrue();
    expect(component.salesOrderItemsArray.length).toBe(1);
    expect(component.salesOrderItemsArray.at(0).get('productId')?.value).toBe('p1');
    expect(component.salesOrderItemsArray.at(0).get('unitPrice')?.value).toBe(100);
  }));

  it('onProductSelection adds a row and clears the product name control', fakeAsync(() => {
    create();
    component.productNameControl.setValue('Coke');
    component.onProductSelection(makeProduct());
    expect(component.salesOrderItemsArray.length).toBe(1);
    const item = component.salesOrderItemsArray.at(0);
    expect(item.get('productId')?.value).toBe('p1');
    expect(item.get('unitPrice')?.value).toBe(100);
    expect(item.get('quantity')?.value).toBe(1);
    expect(item.get('taxIds')?.value).toEqual(['t1']);
    expect(component.productNameControl.value).toBe('');
  }));

  it('onProductSelection for an existing product increments quantity', fakeAsync(() => {
    create();
    component.onProductSelection(makeProduct());
    component.onProductSelection(makeProduct());
    expect(component.salesOrderItemsArray.length).toBe(1);
    expect(component.salesOrderItemsArray.at(0).get('quantity')?.value).toBe(2);
  }));

  it('onProductSelection for a variant product adds every variant child', fakeAsync(() => {
    create();
    productService.getProductsDropdown.calls.reset();
    productService.getProductsDropdown.and.returnValue(of([makeProduct({ id: 'vc1', name: 'S' }), makeProduct({ id: 'vc2', name: 'L' })]));
    component.onProductSelection(makeProduct({ id: 'vp', hasVariant: true }));
    expect(productService.getProductsDropdown).toHaveBeenCalledWith(jasmine.objectContaining({ parentId: 'vp' }));
    expect(component.salesOrderItemsArray.length).toBe(2);
    expect(component.salesOrderItemsArray.at(1).get('productId')?.value).toBe('vc2');
  }));

  it('getAllTotal computes totals with round-off and applies flat discount', fakeAsync(() => {
    create();
    component.onProductSelection(makeProduct());
    component.salesOrderItemsArray.at(0).patchValue({ quantity: 2, discountPercentage: 5 });
    component.salesOrderForm.get('flatDiscount')?.setValue(10);
    component.getAllTotal();
    expect(component.totalBeforeDiscount).toBe(200);
    expect(component.totalTax).toBe(19.5);
    expect(component.totalDiscount).toBe(15);
    // 214.5 floored to 214, minus 10 flat = 204; round-off is re-derived AFTER the flat discount -> 0
    expect(component.grandTotal).toBe(204);
    expect(component.totalRoundOff).toBe(0);
  }));

  it('getAllTotal patches each item total to the rounded grand total', fakeAsync(() => {
    create();
    component.onProductSelection(makeProduct());
    component.salesOrderItemsArray.at(0).patchValue({ quantity: 2 });
    component.getAllTotal();
    expect(component.salesOrderItemsArray.at(0).get('total')?.value).toBe(220);
  }));

  it('onTotalChange back-computes the unit price from the entered total', fakeAsync(() => {
    create();
    component.onProductSelection(makeProduct());
    const item = component.salesOrderItemsArray.at(0);
    item.patchValue({ taxPercentage: 10, quantity: 2, discountPercentage: 0, total: '220' });
    component.onTotalChange(0);
    expect(item.get('unitPrice')?.value).toBe(100);
  }));

  it('onDiscountTypeChange resets a non-zero discount and recalculates', fakeAsync(() => {
    create();
    component.onProductSelection(makeProduct());
    const item = component.salesOrderItemsArray.at(0);
    item.patchValue({ quantity: 2, discountPercentage: 5 });
    component.onDiscountTypeChange(0);
    expect(item.get('discountPercentage')?.value).toBe(0);
  }));

  it('onUnitSelectionChange with plus operator rounds the computed price', fakeAsync(() => {
    create();
    component.onProductSelection(makeProduct());
    component.onUnitSelectionChange('uc2', 0);
    expect(component.salesOrderItemsArray.at(0).get('unitPrice')?.value).toBe(105);
  }));

  it('onUnitSelectionChange with unknown unit falls back to sales price and patches unit', fakeAsync(() => {
    create();
    component.onProductSelection(makeProduct());
    component.onUnitSelectionChange('nope', 0);
    const item = component.salesOrderItemsArray.at(0);
    expect(item.get('unitPrice')?.value).toBe(100);
    expect(item.get('unitId')?.value).toBe('nope');
  }));

  it('onRemoveSalesOrderItem removes the row and recomputes', fakeAsync(() => {
    create();
    component.onProductSelection(makeProduct());
    component.onProductSelection(makeProduct({ id: 'p2', name: 'Pepsi' }));
    component.onRemoveSalesOrderItem(0);
    expect(component.salesOrderItemsArray.length).toBe(1);
    expect(component.salesOrderItemsArray.at(0).get('productId')?.value).toBe('p2');
  }));

  it('barcode exact match adds the product and clears the control', fakeAsync(() => {
    create();
    productService.getProductsDropdown.calls.reset();
    productService.getProductsDropdown.and.returnValue(of([makeProduct()]));
    component.barCodeNameControl.setValue('123456');
    tick(600);
    expect(component.salesOrderItemsArray.length).toBe(1);
    expect(component.barCodeNameControl.value).toBe('');
  }));

  it('barcode miss warns product-not-found', fakeAsync(() => {
    create();
    productService.getProductsDropdown.calls.reset();
    productService.getProductsDropdown.and.returnValue(of([]));
    component.barCodeNameControl.setValue('nope');
    tick(600);
    expect(toastrService.warning).toHaveBeenCalled();
    expect(component.salesOrderItemsArray.length).toBe(0);
  }));

  it('product name control emits a debounced dropdown query with page size 10', fakeAsync(() => {
    create();
    productService.getProductsDropdown.calls.reset();
    productService.getProductsDropdown.and.returnValue(of([makeProduct()]));
    let emitted: Product[] = [];
    component.productList$.subscribe((p) => (emitted = p));
    component.productNameControl.setValue('Coke');
    tick(1100);
    const resource = productService.getProductsDropdown.calls.mostRecent().args[0];
    expect(resource.name).toBe('Coke');
    expect(resource.pageSize).toBe(10);
    expect(emitted.length).toBe(1);
  }));

  it('customer name control searches customers after debounce', fakeAsync(() => {
    create();
    customerService.getCustomersForDropDown.calls.reset();
    customerService.getCustomersForDropDown.and.returnValue(of([{ id: 'c1', customerName: 'Cust' } as any]));
    component.customerNameControl.setValue('Cust');
    tick(600);
    expect(customerService.getCustomersForDropDown).toHaveBeenCalledWith('Cust', '');
    expect(component.customers.length).toBe(1);
  }));

  it('invalid submit marks all controls touched and never asks for inventory', fakeAsync(() => {
    create();
    component.onSalesOrderSubmit();
    expect(component.salesOrderForm.touched).toBeTrue();
    expect(productService.getProductsInventory).not.toHaveBeenCalled();
  }));

  it('valid submit without items errors please-select-at-least-one-product', fakeAsync(() => {
    create();
    component.salesOrderForm.patchValue({ customerId: 'c1', locationId: 'l1' });
    component.onSalesOrderSubmit();
    expect(toastrService.error).toHaveBeenCalled();
    expect(storeStub.addUpdateSalesOrder).not.toHaveBeenCalled();
  }));

  it('delivered orders cannot be edited', fakeAsync(() => {
    create({ salesorder: makeExistingOrder({ deliveryStatus: SalesDeliveryStatusEnum.Delivered }) });
    component.salesOrderForm.patchValue({ flatDiscount: 0 });
    component.onSalesOrderSubmit();
    expect(toastrService.error).toHaveBeenCalled();
    expect(productService.getProductsInventory).not.toHaveBeenCalled();
  }));

  it('returned orders cannot be edited', fakeAsync(() => {
    create({ salesorder: makeExistingOrder({ salesOrderStatus: SalesOrderStatusEnum.Return }) });
    component.onSalesOrderSubmit();
    expect(toastrService.error).toHaveBeenCalled();
    expect(storeStub.addUpdateSalesOrder).not.toHaveBeenCalled();
  }));

  it('sufficient stock saves through the store with isAllowPayment false', fakeAsync(() => {
    create();
    component.salesOrderForm.patchValue({ customerId: 'c1', locationId: 'l1' });
    component.onProductSelection(makeProduct());
    productService.getProductsInventory.and.returnValue(of([{ productId: 'p1', name: 'Coke', stock: 10, unitId: 'u1', unitName: 'Pc' }] as any));
    component.onSalesOrderSubmit();
    expect(storeStub.addUpdateSalesOrder).toHaveBeenCalledTimes(1);
    const saved = storeStub.addUpdateSalesOrder.calls.mostRecent().args[0] as SalesOrder;
    expect(saved.id).toBe('');
    expect(saved.isAllowPayment).toBeFalse();
    expect(saved.salesOrderItems[0].productId).toBe('p1');
  }));

  it('edit submit keeps the existing id and builds per-tax rows', fakeAsync(() => {
    create({ salesorder: makeExistingOrder() });
    component.salesOrderItemsArray.at(0).patchValue({ quantity: 2, discountPercentage: 5 });
    component.getAllTotal();
    productService.getProductsInventory.and.returnValue(of([{ productId: 'p1', name: 'Coke', stock: 10, unitId: 'u1', unitName: 'Pc' }] as any));
    component.onSalesOrderSubmit();
    const saved = storeStub.addUpdateSalesOrder.calls.mostRecent().args[0] as SalesOrder;
    expect(saved.id).toBe('so-9');
    const item = saved.salesOrderItems[0];
    expect(item.discount).toBe(5);
    expect(item.taxValue).toBe(19.5);
    expect(item.salesOrderItemTaxes[0].taxId).toBe('t1');
    // per-tax rows are NOT parseFloat'ed — raw pipe string
    expect(item.salesOrderItemTaxes[0].taxValue as unknown).toBe('19.50');
  }));

  it('insufficient stock opens the stock alert dialog and declines saving on dismiss', fakeAsync(() => {
    create();
    component.salesOrderForm.patchValue({ customerId: 'c1', locationId: 'l1' });
    component.onProductSelection(makeProduct());
    productService.getProductsInventory.and.returnValue(of([{ productId: 'p1', name: 'Coke', stock: 0, unitId: 'u1', unitName: 'Pc' }] as any));
    dialog.open.and.returnValue({ afterClosed: () => of(false) } as any);
    component.onSalesOrderSubmit();
    expect(dialog.open).toHaveBeenCalled();
    expect(storeStub.addUpdateSalesOrder).not.toHaveBeenCalled();
  }));

  it('insufficient stock saves when the stock alert dialog is confirmed', fakeAsync(() => {
    create();
    component.salesOrderForm.patchValue({ customerId: 'c1', locationId: 'l1' });
    component.onProductSelection(makeProduct());
    productService.getProductsInventory.and.returnValue(of([{ productId: 'p1', name: 'Coke', stock: 0, unitId: 'u1', unitName: 'Pc' }] as any));
    dialog.open.and.returnValue({ afterClosed: () => of(true) } as any);
    component.onSalesOrderSubmit();
    expect(storeStub.addUpdateSalesOrder).toHaveBeenCalledTimes(1);
  }));

  it('store add/update completion with payment disabled navigates to the list', fakeAsync(() => {
    create();
    isAddUpdateSignal.set(true);
    fixture.detectChanges();
    flush();
    expect(router.navigate).toHaveBeenCalledWith(['/sales-order/list']);
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
    expect(router.navigate).toHaveBeenCalledWith(['/sales-order/list']);
  }));

  it('addNewCustomer pushes the dialog result and selects it', fakeAsync(() => {
    create();
    const newCustomer = { id: 'c9', customerName: 'New Cust' };
    dialog.open.and.returnValue({ afterClosed: () => of(newCustomer) } as any);
    component.addNewCustomer();
    expect(dialog.open).toHaveBeenCalled();
    expect(component.customers.find((c) => c.id === 'c9')).toBeTruthy();
    expect(component.salesOrderForm.get('customerId')?.value).toBe('c9');
  }));

  it('onSalesOrderList navigates to the sales order list', fakeAsync(() => {
    create();
    component.onSalesOrderList();
    expect(router.navigate).toHaveBeenCalledWith(['/sales-order/list']);
  }));

  it('getSalesOrderRequestById hydrates the form, items and customers from a request order', fakeAsync(() => {
    create();
    customerService.getCustomersForDropDown.calls.reset();
    customerService.getCustomersForDropDown.and.returnValue(of([{ id: 'c1' } as any]));
    component.getSalesOrderRequestById('sr-1');
    expect(salesOrderService.getSalesOrderById).toHaveBeenCalledWith('sr-1');
    expect(component.salesOrderForm.get('customerId')?.value).toBe('c1');
    expect(component.salesOrderItemsArray.length).toBe(1);
    expect(component.salesOrderItemsArray.at(0).get('productId')?.value).toBe('p1');
    expect(customerService.getCustomersForDropDown).toHaveBeenCalledWith('', 'c1');
  }));

  it('convertFromSalesRequest hydrates from the dialog-selected request id', fakeAsync(() => {
    create();
    salesOrderService.getSalesOrderById.and.returnValue(of(makeExistingOrder()));
    dialog.open.and.returnValue({ afterClosed: () => of('sr-2') } as any);
    component.convertFromSalesRequest();
    expect(salesOrderService.getSalesOrderById).toHaveBeenCalledWith('sr-2');
    expect(component.salesOrderItemsArray.length).toBe(1);
  }));
});
