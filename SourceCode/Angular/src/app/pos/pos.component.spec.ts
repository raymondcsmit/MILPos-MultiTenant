import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';
import { BehaviorSubject, of, Subject } from 'rxjs';

import { PosComponent } from './pos.component';
import { CustomerService } from '../customer/customer.service';
import { ProductService } from '../product/product.service';
import { SalesOrderService } from '../sales-order/sales-order.service';
import { CommonService } from '@core/services/common.service';
import { PurchaseOrderPaymentService } from '../purchase-order/purchase-order-payment.service';
import { BrandService } from '@core/services/brand.service';
import { ProductCategoryService } from '@core/services/product-category.service';
import { ClonerService } from '@core/services/clone.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { Operators } from '@core/domain-classes/operator';
import { Product } from '@core/domain-classes/product';
import { Tax } from '@core/domain-classes/tax';
import { UnitConversation } from '@core/domain-classes/unit-conversation';
import { SalesOrder } from '@core/domain-classes/sales-order';

describe('PosComponent', () => {
  let component: PosComponent;
  let fixture: ComponentFixture<PosComponent>;
  let customerService: jasmine.SpyObj<CustomerService>;
  let productService: jasmine.SpyObj<ProductService>;
  let salesOrderService: jasmine.SpyObj<SalesOrderService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let paymentService: jasmine.SpyObj<PurchaseOrderPaymentService>;
  let brandService: jasmine.SpyObj<BrandService>;
  let categoryService: jasmine.SpyObj<ProductCategoryService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let dialog: any;
  let router: Router;
  let routeData$: BehaviorSubject<any>;

  const tax: Tax = { id: 't1', name: 'GST', percentage: 10 } as Tax;
  const taxes: Tax[] = [tax];
  const units: UnitConversation[] = [
    { id: 'u1', name: 'Pc', parentId: null, operator: Operators.Plush, value: '0' },
    { id: 'uc2', name: 'Box', parentId: 'u1', operator: Operators.Plush, value: '5' },
  ] as unknown as UnitConversation[];
  const walkIn = { id: 'w1', customerName: 'Walk In', isWalkIn: true };
  const regular = { id: 'c1', customerName: 'Cust One', isWalkIn: false };

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

  beforeEach(async () => {
    routeData$ = new BehaviorSubject<any>({});
    customerService = jasmine.createSpyObj<CustomerService>('CustomerService', ['getCustomersForDropDown']);
    productService = jasmine.createSpyObj<ProductService>('ProductService', ['getProductsDropdown', 'getProductsInventory']);
    salesOrderService = jasmine.createSpyObj<SalesOrderService>('SalesOrderService', ['getNewSalesOrderNumber', 'addSalesOrder', 'getSalesOrderById']);
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getLocationsForCurrentUser']);
    paymentService = jasmine.createSpyObj<PurchaseOrderPaymentService>('PurchaseOrderPaymentService', ['getPaymentMethod']);
    brandService = jasmine.createSpyObj<BrandService>('BrandService', ['getAll']);
    categoryService = jasmine.createSpyObj<ProductCategoryService>('ProductCategoryService', ['getAll']);
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error', 'warning']);
    const translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new Subject<string>().asObservable();
    const securityService = jasmine.createSpyObj<SecurityService>('SecurityService', ['hasClaim']);
    securityService.currencyCode = 'USD';
    (securityService as any).isPOSPermissionOnly = false;
    (securityService as any).companyProfile = new Subject<any>().asObservable();

    await TestBed.configureTestingModule({
      imports: [PosComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        CurrencyPipe,
        provideNativeDateAdapter(),
        ClonerService,
        { provide: CustomerService, useValue: customerService },
        { provide: ProductService, useValue: productService },
        { provide: SalesOrderService, useValue: salesOrderService },
        { provide: CommonService, useValue: commonService },
        { provide: PurchaseOrderPaymentService, useValue: paymentService },
        { provide: BrandService, useValue: brandService },
        { provide: ProductCategoryService, useValue: categoryService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: SecurityService, useValue: securityService },
        { provide: ActivatedRoute, useValue: buildRoute() },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  function buildRoute() {
    return {
      snapshot: { data: { units: [...units], taxs: [...taxes] } },
      data: routeData$.asObservable(),
      url: { subscribe: () => ({ unsubscribe: () => { } }) },
      params: { subscribe: () => ({ unsubscribe: () => { } }) },
      queryParams: { subscribe: () => ({ unsubscribe: () => { } }) },
      paramMap: { subscribe: () => ({ unsubscribe: () => { } }) },
      queryParamMap: { subscribe: () => ({ unsubscribe: () => { } }) },
    };
  }

  function create(routeData: any = {}, opts: { customers?: any[] } = {}): void {
    customerService.getCustomersForDropDown.and.returnValue(of(opts.customers ?? [walkIn, regular] as any));
    salesOrderService.getNewSalesOrderNumber.and.returnValue(of({ orderNumber: 'SO-100' } as any));
    salesOrderService.addSalesOrder.and.returnValue(of({ id: 'so-new' } as any));
    salesOrderService.getSalesOrderById.and.returnValue(of({ id: 'so-new', orderNumber: 'SO-100', salesOrderItems: [] } as any));
    productService.getProductsDropdown.and.returnValue(of([]));
    productService.getProductsInventory.and.returnValue(of([]));
    commonService.getLocationsForCurrentUser.and.returnValue(of({ locations: [{ id: 'l1', name: 'Main' }], selectedLocation: 'l1' } as any));
    paymentService.getPaymentMethod.and.returnValue(of([{ id: 1 }, { id: 2 }] as any));
    brandService.getAll.and.returnValue(of([{ id: 'b1', name: 'Brand' }] as any));
    categoryService.getAll.and.returnValue(of([{ id: 'cat1', name: 'Cat' }] as any));
    fixture = TestBed.createComponent(PosComponent);
    component = fixture.componentInstance;
    dialog = (component as any).dialog;
    spyOn(dialog, 'open');
    routeData$.next(routeData);
    fixture.detectChanges();
    tick(600);
  }

  function addProduct(product: Product): void {
    component.onProductSelect(product);
  }

  it('builds the form and patches the fetched new order number', fakeAsync(() => {
    create();
    expect(component.salesOrderForm).toBeTruthy();
    expect(component.salesOrderForm.get('orderNumber')?.value).toBe('SO-100');
    expect(component.isEdit).toBeFalse();
  }));

  it('loads locations and patches the selected location', fakeAsync(() => {
    create();
    expect(component.locations.length).toBe(1);
    expect(component.salesOrderForm.get('locationId')?.value).toBe('l1');
  }));

  it('loads payment methods, brands and categories', fakeAsync(() => {
    create();
    expect(component.paymentMethodslist.length).toBe(2);
    expect(component.brands.length).toBe(1);
    expect(component.categories.length).toBe(1);
  }));

  it('auto-selects the walk-in customer when present', fakeAsync(() => {
    create();
    expect(component.salesOrderForm.get('customerId')?.value).toBe('w1');
  }));

  it('falls back to the first customer when there is no walk-in customer', fakeAsync(() => {
    create({}, { customers: [regular] });
    expect(component.salesOrderForm.get('customerId')?.value).toBe('c1');
  }));

  it('checkPOSPermission mirrors securityService.isPOSPermissionOnly', fakeAsync(() => {
    create();
    expect(component.hasOnlyPOSPermission).toBeFalse();
    component.checkPOSPermission();
    (component['securityService'] as any).isPOSPermissionOnly = true;
    component.checkPOSPermission();
    expect(component.hasOnlyPOSPermission).toBeTrue();
  }));

  it('onProductSelect pushes a row with price, quantity, taxes and unit map', fakeAsync(() => {
    create();
    addProduct(makeProduct());
    expect(component.salesOrderItemsArray.length).toBe(1);
    const item = component.salesOrderItemsArray.at(0);
    expect(item.get('productId')?.value).toBe('p1');
    expect(item.get('unitPrice')?.value).toBe(100);
    expect(item.get('quantity')?.value).toBe(1);
    expect(item.get('taxValue')?.value).toEqual(['t1']);
    // createSalesOrderItem seeds 10 from productTaxes, but onProductSelect ends
    // with getAllTotal() which overwrites taxPercentage to 0 (form exposes
    // taxValue, not taxIds) — pinned characterization.
    expect(item.get('taxPercentage')?.value).toBe(0);
    expect(component.unitsMap[0].length).toBe(2);
  }));

  it('onProductSelect for an existing product increments quantity instead of adding a row', fakeAsync(() => {
    create();
    addProduct(makeProduct());
    addProduct(makeProduct());
    expect(component.salesOrderItemsArray.length).toBe(1);
    expect(component.salesOrderItemsArray.at(0).get('quantity')?.value).toBe(2);
  }));

  it('getAllTotal computes sub total, tax, discount and grand total with flat discount', fakeAsync(() => {
    create();
    addProduct(makeProduct());
    component.salesOrderItemsArray.at(0).patchValue({ quantity: 2, discountPercentage: 5, discountType: 'fixed' });
    component.salesOrderForm.get('flatDiscount')?.setValue(10);
    component.getAllTotal();
    expect(component.totalBeforeDiscount).toBe(200);
    expect(component.totalDiscount).toBe(15);
    expect(component.totalTax).toBe(19.5);
    expect(component.grandTotal).toBe(204.5);
  }));

  it('characterization: getAllTotal patches item taxPercentage to 0 because the form exposes taxValue not taxIds', fakeAsync(() => {
    create();
    addProduct(makeProduct());
    component.salesOrderItemsArray.at(0).patchValue({ quantity: 2 });
    component.getAllTotal();
    expect(component.salesOrderItemsArray.at(0).get('taxPercentage')?.value).toBe(0);
    expect(component.grandTotal).toBe(220);
  }));

  it('onSelectionChange with a plus operator adds the unit value to the sales price', fakeAsync(() => {
    create();
    const product = makeProduct();
    addProduct(product);
    component.filterProducts = [product];
    component.onSelectionChange('uc2', 0);
    expect(component.salesOrderItemsArray.at(0).get('unitPrice')?.value).toBe(105);
  }));

  it('onSelectionChange with an unknown unit falls back to the product sales price', fakeAsync(() => {
    create();
    const product = makeProduct();
    addProduct(product);
    component.filterProducts = [product];
    component.onSelectionChange('nope', 0);
    expect(component.salesOrderItemsArray.at(0).get('unitPrice')?.value).toBe(100);
  }));

  it('onTotalChange back-computes the unit price from the entered total', fakeAsync(() => {
    create();
    addProduct(makeProduct());
    const item = component.salesOrderItemsArray.at(0);
    item.patchValue({ taxPercentage: 10, quantity: 2, discountPercentage: 0, discountType: 'fixed', total: '220' });
    component.onTotalChange(0);
    expect(item.get('unitPrice')?.value).toBe(100);
  }));

  it('onRemoveSalesOrderItem removes the row and recomputes totals', fakeAsync(() => {
    create();
    addProduct(makeProduct());
    addProduct(makeProduct({ id: 'p2', name: 'Pepsi' }));
    component.onRemoveSalesOrderItem(0);
    expect(component.salesOrderItemsArray.length).toBe(1);
    expect(component.salesOrderItemsArray.at(0).get('productId')?.value).toBe('p2');
  }));

  it('barcode exact match adds the product, toasts success and clears the input', fakeAsync(() => {
    productService.getProductsDropdown.and.returnValues(of([]), of([makeProduct()]));
    create();
    productService.getProductsDropdown.calls.reset();
    productService.getProductsDropdown.and.returnValue(of([makeProduct()]));
    component.salesOrderForm.get('filterBarCodeValue')?.setValue('123456');
    tick(600);
    expect(component.salesOrderItemsArray.length).toBe(1);
    expect(toastrService.success).toHaveBeenCalled();
    expect(component.salesOrderForm.get('filterBarCodeValue')?.value).toBe('');
  }));

  it('barcode of a variant product adds every variant child', fakeAsync(() => {
    const variantParent = makeProduct({ id: 'vp', hasVariant: true });
    const child1 = makeProduct({ id: 'vc1', name: 'Coke S' });
    const child2 = makeProduct({ id: 'vc2', name: 'Coke L' });
    create();
    productService.getProductsDropdown.calls.reset();
    productService.getProductsDropdown.and.returnValues(of([variantParent]), of([child1, child2]));
    component.salesOrderForm.get('filterBarCodeValue')?.setValue('123456');
    tick(600);
    expect(component.salesOrderItemsArray.length).toBe(2);
    expect(component.salesOrderItemsArray.at(0).get('productId')?.value).toBe('vc1');
    expect(component.salesOrderItemsArray.at(1).get('productId')?.value).toBe('vc2');
  }));

  it('barcode miss warns product-not-found and clears the input', fakeAsync(() => {
    create();
    productService.getProductsDropdown.calls.reset();
    productService.getProductsDropdown.and.returnValue(of([]));
    component.salesOrderForm.get('filterBarCodeValue')?.setValue('noman');
    tick(600);
    expect(toastrService.warning).toHaveBeenCalled();
    expect(component.salesOrderItemsArray.length).toBe(0);
    expect(component.salesOrderForm.get('filterBarCodeValue')?.value).toBe('');
  }));

  it('product name filter populates filterProducts with a deep clone', fakeAsync(() => {
    const product = makeProduct();
    create();
    productService.getProductsDropdown.calls.reset();
    productService.getProductsDropdown.and.returnValue(of([product]));
    component.salesOrderForm.get('filterProductValue')?.setValue('Coke');
    tick(600);
    expect(component.filterProducts.length).toBe(1);
    expect(component.filterProducts[0]).not.toBe(product);
    expect(component.filterProducts[0].name).toBe('Coke');
  }));

  it('filerCustomer searches customers by name after debounce', fakeAsync(() => {
    create();
    customerService.getCustomersForDropDown.calls.reset();
    customerService.getCustomersForDropDown.and.returnValue(of([regular] as any));
    component.salesOrderForm.get('filerCustomer')?.setValue('Cust');
    tick(600);
    expect(customerService.getCustomersForDropDown).toHaveBeenCalledWith('Cust', '');
    expect(component.customers.length).toBe(1);
  }));

  it('invalid submit marks all controls touched and never asks for inventory', fakeAsync(() => {
    create();
    component.salesOrderForm.get('locationId')?.setValue('');
    component.onSalesOrderSubmit();
    expect(component.salesOrderForm.touched).toBeTrue();
    expect(productService.getProductsInventory).not.toHaveBeenCalled();
  }));

  it('valid form without items errors please-select-at-least-one-product', fakeAsync(() => {
    create();
    component.salesOrderForm.patchValue({ customerId: 'w1', locationId: 'l1' });
    component.onSalesOrderSubmit();
    expect(toastrService.error).toHaveBeenCalled();
    expect(productService.getProductsInventory).not.toHaveBeenCalled();
  }));

  it('submit with sufficient stock saves, flags POS screen order and resets for a new order', fakeAsync(() => {
    create();
    component.salesOrderForm.patchValue({ customerId: 'w1', locationId: 'l1' });
    addProduct(makeProduct());
    productService.getProductsInventory.and.returnValue(of([{ productId: 'p1', name: 'Coke', stock: 10, unitId: 'u1', unitName: 'Pc' }] as any));
    salesOrderService.addSalesOrder.calls.reset();
    salesOrderService.getNewSalesOrderNumber.calls.reset();
    component.onSalesOrderSubmit();
    expect(salesOrderService.addSalesOrder).toHaveBeenCalledTimes(1);
    const saved = salesOrderService.addSalesOrder.calls.mostRecent().args[0] as SalesOrder;
    expect(saved.isPOSScreenOrder).toBeTrue();
    expect(salesOrderService.getSalesOrderById).toHaveBeenCalledWith('so-new');
    expect(component.salesOrderForInvoice).toBeTruthy();
    expect(component.salesOrderItemsArray.length).toBe(0);
    expect(component.grandTotal).toBe(0);
    expect(salesOrderService.getNewSalesOrderNumber).toHaveBeenCalled();
  }));

  it('submit builds item payload with discount, tax value and per-tax rows', fakeAsync(() => {
    create();
    component.salesOrderForm.patchValue({ customerId: 'w1', locationId: 'l1', flatDiscount: 0 });
    addProduct(makeProduct());
    component.salesOrderItemsArray.at(0).patchValue({ quantity: 2, discountPercentage: 5, discountType: 'fixed' });
    component.getAllTotal();
    productService.getProductsInventory.and.returnValue(of([{ productId: 'p1', name: 'Coke', stock: 10, unitId: 'u1', unitName: 'Pc' }] as any));
    salesOrderService.addSalesOrder.calls.reset();
    component.onSalesOrderSubmit();
    const saved = salesOrderService.addSalesOrder.calls.mostRecent().args[0] as SalesOrder;
    expect(saved.totalAmount).toBe(214.5);
    // discount amount is the flat 5 (NOT 5 x quantity) per quantities-unitprice-tax pipe semantics
    expect(saved.totalDiscount).toBe(5);
    expect(saved.totalTax).toBe(19.5);
    const item = saved.salesOrderItems[0];
    expect(item.discount).toBe(5);
    expect(item.taxValue).toBe(19.5);
    expect(item.unitPrice).toBe(100);
    expect(item.quantity).toBe(2);
    expect(item.salesOrderItemTaxes.length).toBe(1);
    expect(item.salesOrderItemTaxes[0].taxId).toBe('t1');
    // per-tax rows are NOT parseFloat'ed — raw pipe string
    expect(item.salesOrderItemTaxes[0].taxValue as unknown).toBe('19.50');
  }));

  it('insufficient stock opens the stock alert dialog and declines saving on dismiss', fakeAsync(() => {
    create();
    component.salesOrderForm.patchValue({ customerId: 'w1', locationId: 'l1' });
    addProduct(makeProduct());
    productService.getProductsInventory.and.returnValue(of([{ productId: 'p1', name: 'Coke', stock: 0, unitId: 'u1', unitName: 'Pc' }] as any));
    dialog.open.and.returnValue({ afterClosed: () => of(false) } as any);
    salesOrderService.addSalesOrder.calls.reset();
    component.onSalesOrderSubmit();
    expect(dialog.open).toHaveBeenCalled();
    expect(salesOrderService.addSalesOrder).not.toHaveBeenCalled();
  }));

  it('insufficient stock saves when the stock alert dialog is confirmed', fakeAsync(() => {
    create();
    component.salesOrderForm.patchValue({ customerId: 'w1', locationId: 'l1' });
    addProduct(makeProduct());
    productService.getProductsInventory.and.returnValue(of([{ productId: 'p1', name: 'Coke', stock: 0, unitId: 'u1', unitName: 'Pc' }] as any));
    dialog.open.and.returnValue({ afterClosed: () => of(true) } as any);
    salesOrderService.addSalesOrder.calls.reset();
    component.onSalesOrderSubmit();
    expect(dialog.open).toHaveBeenCalled();
    expect(salesOrderService.addSalesOrder).toHaveBeenCalledTimes(1);
  }));

  it('a failed save surfaces no success toast and does not crash', fakeAsync(() => {
    create();
    component.salesOrderForm.patchValue({ customerId: 'w1', locationId: 'l1' });
    addProduct(makeProduct());
    productService.getProductsInventory.and.returnValue(of([{ productId: 'p1', name: 'Coke', stock: 10, unitId: 'u1', unitName: 'Pc' }] as any));
    salesOrderService.addSalesOrder.and.returnValue(new Subject<any>().asObservable());
    component.onSalesOrderSubmit();
    expect(toastrService.success).not.toHaveBeenCalled();
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
    dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as any);
    component.addNewCustomer();
    expect(component.customers.find((c) => c.id === 'c9')).toBeUndefined();
  }));

  it('onSalesOrderList navigates to the dashboard', fakeAsync(() => {
    create();
    component.onSalesOrderList();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  }));

  it('toggleDrawer toggles category and brand drawers and closes both by default', fakeAsync(() => {
    create();
    component.toggleDrawer('CATEGORY');
    expect(component.isCategoryOpen).toBeTrue();
    component.toggleDrawer('CATEGORY');
    expect(component.isCategoryOpen).toBeFalse();
    component.toggleDrawer('BRAND');
    expect(component.isBrandOpen).toBeTrue();
    component.toggleDrawer();
    expect(component.isBrandOpen).toBeFalse();
    expect(component.isCategoryOpen).toBeFalse();
  }));

  it('onCategorySelected fetches variant products for the category', fakeAsync(() => {
    create();
    productService.getProductsDropdown.calls.reset();
    productService.getProductsDropdown.and.returnValue(of([makeProduct()]));
    component.onCategorySelected('cat1');
    expect(component.selectedCategoryId).toBe('cat1');
    const resource = productService.getProductsDropdown.calls.mostRecent().args[0];
    expect(resource.categoryId).toBe('cat1');
    expect(component.filterProducts.length).toBe(1);
  }));

  it('onBrandSelected fetches variant products for the brand', fakeAsync(() => {
    create();
    productService.getProductsDropdown.calls.reset();
    productService.getProductsDropdown.and.returnValue(of([makeProduct()]));
    component.onBrandSelected('b1');
    expect(component.selectedBrandId).toBe('b1');
    const resource = productService.getProductsDropdown.calls.mostRecent().args[0];
    expect(resource.brandId).toBe('b1');
    expect(component.filterProducts.length).toBe(1);
  }));

  it('edit mode keeps the existing order id and does not patch the order number', fakeAsync(() => {
    const existing = { id: 'so-9', customerId: 'c1', orderNumber: 'SO-9' } as SalesOrder;
    create({ salesorder: existing }, { customers: [regular] });
    expect(component.salesOrder).toBe(existing);
    expect(component.salesOrderForm.get('orderNumber')?.value).toBe('');
    const built = component.buildSalesOrder();
    expect(built.id).toBe('so-9');
  }));

  it('buildSalesOrder on a new order emits an empty id', fakeAsync(() => {
    create();
    const built = component.buildSalesOrder();
    expect(built.id).toBe('');
  }));
});
