import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';
import { signal } from '@angular/core';
import { BehaviorSubject, of, Subject } from 'rxjs';

import { SalesOrderRequestAddEditComponent } from './sales-order-request-add-edit.component';
import { CustomerService } from '../../customer/customer.service';
import { ProductService } from '../../product/product.service';
import { SalesOrderService } from '../../sales-order/sales-order.service';
import { CommonService } from '@core/services/common.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { SalesOrderRequestStore } from '../sales-order-request-store';
import { Operators } from '@core/domain-classes/operator';
import { Product } from '@core/domain-classes/product';
import { Tax } from '@core/domain-classes/tax';
import { UnitConversation } from '@core/domain-classes/unit-conversation';
import { SalesOrder } from '@core/domain-classes/sales-order';
import { SalesDeliveryStatusEnum } from '@core/domain-classes/sales-delivery-statu';

describe('SalesOrderRequestAddEditComponent', () => {
  let component: SalesOrderRequestAddEditComponent;
  let fixture: ComponentFixture<SalesOrderRequestAddEditComponent>;
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

  function makeExistingOrder(): SalesOrder {
    return {
      id: 'sor-9',
      orderNumber: 'SOR-9',
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
    } as unknown as SalesOrder;
  }

  beforeEach(async () => {
    routeData$ = new BehaviorSubject<any>({});
    isAddUpdateSignal = signal(false);
    storeStub = {
      isAddUpdate: isAddUpdateSignal,
      addUpdateSalesOrder: jasmine.createSpy('addUpdateSalesOrder'),
    };
    customerService = jasmine.createSpyObj<CustomerService>('CustomerService', ['getCustomersForDropDown']);
    productService = jasmine.createSpyObj<ProductService>('ProductService', ['getProductsDropdown']);
    salesOrderService = jasmine.createSpyObj<SalesOrderService>('SalesOrderService', ['getNewSalesOrderNumber']);
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getLocationsForCurrentUser', 'getPageHelperText']);
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error', 'warning']);
    const translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new Subject<string>().asObservable();
    const securityService = jasmine.createSpyObj<SecurityService>('SecurityService', ['hasClaim']);
    securityService.currencyCode = 'USD';
    (securityService as any).companyProfile = new Subject<any>().asObservable();

    await TestBed.configureTestingModule({
      imports: [SalesOrderRequestAddEditComponent, TranslateModule.forRoot()],
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
        { provide: SalesOrderRequestStore, useValue: storeStub },
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
    salesOrderService.getNewSalesOrderNumber.and.returnValue(of({ orderNumber: 'SOR-100' } as any));
    productService.getProductsDropdown.and.returnValue(of([]));
    commonService.getLocationsForCurrentUser.and.returnValue(of({ locations: [{ id: 'l1', name: 'Main' }], selectedLocation: 'l1' } as any));
    fixture = TestBed.createComponent(SalesOrderRequestAddEditComponent);
    component = fixture.componentInstance;
    dialog = (component as any).dialog;
    spyOn(dialog, 'open').and.returnValue({ afterClosed: () => of(false) } as any);
    routeData$.next(routeData);
    fixture.detectChanges();
    tick(1100);
  }

  it('new request builds the form, fetches the next order number and defaults Pending', fakeAsync(() => {
    create();
    expect(component.salesOrderForm).toBeTruthy();
    expect(component.salesOrderForm.get('orderNumber')?.value).toBe('SOR-100');
    expect(component.salesOrderForm.get('deliveryStatus')?.value).toBe(SalesDeliveryStatusEnum.Pending);
  }));

  it('new request loads locations and patches the selected location', fakeAsync(() => {
    create();
    expect(component.locations.length).toBe(1);
    expect(component.salesOrderForm.get('locationId')?.value).toBe('l1');
  }));

  it('edit mode patches the request, disables order/location inputs and patches items', fakeAsync(() => {
    create({ salesorder: makeExistingOrder() });
    expect(component.salesOrderForm.get('id')?.value).toBe('sor-9');
    expect(component.salesOrderForm.get('orderNumber')?.value).toBe('SOR-9');
    expect(component.salesOrderForm.get('orderNumber')?.disabled).toBeTrue();
    expect(component.salesOrderForm.get('locationId')?.disabled).toBeTrue();
    expect(component.salesOrderItemsArray.length).toBe(1);
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
    expect(item.get('taxIds')?.value).toEqual(['t1']);
    expect(item.get('taxPercentage')?.value).toBe(10);
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
    expect(component.salesOrderItemsArray.length).toBe(2);
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
    expect(component.grandTotal).toBe(204);
    expect(component.totalRoundOff).toBe(0);
    expect(component.salesOrderItemsArray.at(0).get('total')?.value).toBe(214.5);
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

  it('onUnitSelectionChange with plus operator adjusts the unit price', fakeAsync(() => {
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

  it('invalid submit marks all controls touched and never saves', fakeAsync(() => {
    create();
    component.onSalesOrderSubmit();
    expect(component.salesOrderForm.touched).toBeTrue();
    expect(storeStub.addUpdateSalesOrder).not.toHaveBeenCalled();
  }));

  it('valid submit without items errors please-select-at-least-one-product', fakeAsync(() => {
    create();
    component.salesOrderForm.patchValue({ customerId: 'c1', locationId: 'l1' });
    component.onSalesOrderSubmit();
    expect(toastrService.error).toHaveBeenCalled();
    expect(storeStub.addUpdateSalesOrder).not.toHaveBeenCalled();
  }));

  it('new request submit saves through the store flagged as a sales order request', fakeAsync(() => {
    create();
    component.salesOrderForm.patchValue({ customerId: 'c1', locationId: 'l1' });
    component.onProductSelection(makeProduct());
    component.salesOrderItemsArray.at(0).patchValue({ quantity: 2, discountPercentage: 5 });
    component.getAllTotal();
    component.onSalesOrderSubmit();
    expect(storeStub.addUpdateSalesOrder).toHaveBeenCalledTimes(1);
    const saved = storeStub.addUpdateSalesOrder.calls.mostRecent().args[0] as SalesOrder;
    expect(saved.id).toBe('');
    expect(saved.isSalesOrderRequest).toBeTrue();
    // no flat discount here: 214.5 floored
    expect(saved.totalAmount).toBe(214);
    expect(saved.totalDiscount).toBe(5);
    const item = saved.salesOrderItems[0];
    expect(item.discount).toBe(5);
    expect(item.taxValue).toBe(19.5);
    expect(item.salesOrderItemTaxes[0].taxId).toBe('t1');
    expect(item.salesOrderItemTaxes[0].taxValue as unknown).toBe('19.50');
  }));

  it('edit request submit keeps the existing id', fakeAsync(() => {
    create({ salesorder: makeExistingOrder() });
    component.onSalesOrderSubmit();
    const saved = storeStub.addUpdateSalesOrder.calls.mostRecent().args[0] as SalesOrder;
    expect(saved.id).toBe('sor-9');
    expect(saved.isSalesOrderRequest).toBeTrue();
  }));

  it('store add/update completion navigates to the request list', fakeAsync(() => {
    create();
    isAddUpdateSignal.set(true);
    fixture.detectChanges();
    flush();
    expect(router.navigate).toHaveBeenCalledWith(['/sales-order-request/list']);
  }));

  it('onSalesOrderList navigates to the request list', fakeAsync(() => {
    create();
    component.onSalesOrderList();
    expect(router.navigate).toHaveBeenCalledWith(['/sales-order-request/list']);
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

  it('addNewCustomer with a dismissed dialog does nothing', fakeAsync(() => {
    create();
    component.addNewCustomer();
    expect(component.customers.find((c) => c.id === 'c9')).toBeUndefined();
  }));
});
