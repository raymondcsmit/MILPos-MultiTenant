import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe, Location } from '@angular/common';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';
import { signal } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { BehaviorSubject, of, Subject } from 'rxjs';

import { SaleOrderReturnComponent } from './sale-order-return.component';
import { CustomerService } from '../../customer/customer.service';
import { SalesOrderService } from '../../sales-order/sales-order.service';
import { CommonService } from '@core/services/common.service';
import { PurchaseOrderPaymentService } from '../../purchase-order/purchase-order-payment.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { SalesOrderReturnStore } from '../sale-order-return-store';
import { SalesOrderStore } from '../../sales-order/sales-order-store';
import { Product } from '@core/domain-classes/product';
import { Tax } from '@core/domain-classes/tax';
import { SalesOrder } from '@core/domain-classes/sales-order';
import { SalesOrderItem } from '@core/domain-classes/sales-order-item';
import { SalesOrderStatusEnum } from '@core/domain-classes/sales-order-status';

describe('SaleOrderReturnComponent', () => {
  let component: SaleOrderReturnComponent;
  let fixture: ComponentFixture<SaleOrderReturnComponent>;
  let customerService: jasmine.SpyObj<CustomerService>;
  let salesOrderService: jasmine.SpyObj<SalesOrderService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let paymentService: jasmine.SpyObj<PurchaseOrderPaymentService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let dialog: any;
  let router: Router;
  let routeData$: BehaviorSubject<any>;
  let isAddUpdateSignal: ReturnType<typeof signal<boolean>>;
  let returnStoreStub: any;
  let salesOrderStoreStub: any;

  const tax: Tax = { id: 't1', name: 'GST', percentage: 10 } as Tax;
  const taxes: Tax[] = [tax];

  function makeProduct(overrides: Partial<Product> = {}): Product {
    return { id: 'p1', name: 'Coke', unitId: 'u1', salesPrice: 100, ...overrides } as Product;
  }

  function makeReturnItem(overrides: Partial<SalesOrderItem> = {}): SalesOrderItem {
    return {
      productId: 'p1',
      unitId: 'u1',
      unitPrice: 100,
      quantity: 4,
      returnItemsQuantities: 1,
      discountPercentage: 5,
      discountType: 'fixed',
      purchasePrice: 60,
      product: makeProduct(),
      salesOrderItemTaxes: [{ taxId: 't1', tax: tax, taxValue: 0 }],
      ...overrides,
    } as unknown as SalesOrderItem;
  }

  function makeExistingOrder(overrides: any = {}): SalesOrder {
    return {
      id: 'so-9',
      orderNumber: 'SO-9',
      customerId: 'c1',
      locationId: 'l1',
      deliveryDate: '2026-08-01T00:00:00Z',
      soCreatedDate: '2026-08-01T10:00:00Z',
      deliveryStatus: 1,
      flatDiscount: 0,
      totalPaidAmount: 50,
      totalRefundAmount: 0,
      salesOrderItems: [],
      ...overrides,
    } as unknown as SalesOrder;
  }

  function ordersResponse(orders: SalesOrder[]): HttpResponse<SalesOrder[]> {
    return new HttpResponse({ body: orders });
  }

  beforeEach(async () => {
    routeData$ = new BehaviorSubject<any>({});
    isAddUpdateSignal = signal(false);
    returnStoreStub = {
      isAddUpdate: isAddUpdateSignal,
      addUpdateSalesOrderReturn: jasmine.createSpy('addUpdateSalesOrderReturn'),
    };
    salesOrderStoreStub = {
      loadSalesOrderFromReturn: jasmine.createSpy('loadSalesOrderFromReturn'),
    };
    customerService = jasmine.createSpyObj<CustomerService>('CustomerService', ['getCustomersForDropDown']);
    salesOrderService = jasmine.createSpyObj<SalesOrderService>('SalesOrderService', [
      'getAllSalesOrder', 'getSalesOrderByIdReturnItems',
    ]);
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
      imports: [SaleOrderReturnComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        CurrencyPipe,
        provideNativeDateAdapter(),
        { provide: CustomerService, useValue: customerService },
        { provide: SalesOrderService, useValue: salesOrderService },
        { provide: CommonService, useValue: commonService },
        { provide: PurchaseOrderPaymentService, useValue: paymentService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: SecurityService, useValue: securityService },
        { provide: SalesOrderReturnStore, useValue: returnStoreStub },
        { provide: SalesOrderStore, useValue: salesOrderStoreStub },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: { units: [], taxs: [...taxes] } },
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

  function create(routeData: any = {}, opts: { returnItems?: SalesOrderItem[] } = {}): void {
    customerService.getCustomersForDropDown.and.returnValue(of([]));
    salesOrderService.getAllSalesOrder.and.returnValue(of(ordersResponse([])));
    salesOrderService.getSalesOrderByIdReturnItems.and.returnValue(of(opts.returnItems ?? []));
    commonService.getLocationsForCurrentUser.and.returnValue(of({ locations: [{ id: 'l1', name: 'Main' }], selectedLocation: 'l1' } as any));
    paymentService.getPaymentMethod.and.returnValue(of([{ id: 1 }] as any));
    fixture = TestBed.createComponent(SaleOrderReturnComponent);
    component = fixture.componentInstance;
    dialog = (component as any).dialog;
    routeData$.next(routeData);
    fixture.detectChanges();
    tick(1100);
  }

  it('new return builds both forms and fetches returnable orders', fakeAsync(() => {
    create();
    expect(component.salesOrderForm).toBeTruthy();
    expect(component.salesOrderReturnForm).toBeTruthy();
    expect(salesOrderService.getAllSalesOrder).toHaveBeenCalledWith(jasmine.objectContaining({ pageSize: 10, status: SalesOrderStatusEnum.Not_Return }));
    expect(component.paymentMethodslist.length).toBe(1);
  }));

  it('new return loads locations', fakeAsync(() => {
    create();
    expect(component.locations.length).toBe(1);
  }));

  it('customer search on the return form populates customersForSearch', fakeAsync(() => {
    create();
    customerService.getCustomersForDropDown.calls.reset();
    customerService.getCustomersForDropDown.and.returnValue(of([{ id: 'c1', customerName: 'Cust' } as any]));
    component.salesOrderReturnForm.get('filerCustomer')?.setValue('Cust');
    tick(600);
    expect(customerService.getCustomersForDropDown).toHaveBeenCalledWith('Cust', '');
    expect(component.customersForSearch.length).toBe(1);
  }));

  it('order number filter fetches sales orders by order number', fakeAsync(() => {
    create();
    salesOrderService.getAllSalesOrder.calls.reset();
    salesOrderService.getAllSalesOrder.and.returnValue(of(ordersResponse([{ id: 'so-1' } as SalesOrder])));
    component.salesOrderReturnForm.get('filerSalesOrder')?.setValue('SO-');
    tick(600);
    expect(salesOrderService.getAllSalesOrder).toHaveBeenCalledWith(jasmine.objectContaining({ orderNumber: 'SO-' }));
    expect(component.salesorders.length).toBe(1);
  }));

  it('customer selection fetches that customer\'s sales orders', fakeAsync(() => {
    create();
    salesOrderService.getAllSalesOrder.calls.reset();
    salesOrderService.getAllSalesOrder.and.returnValue(of(ordersResponse([{ id: 'so-2' } as SalesOrder])));
    component.salesOrderReturnForm.get('customerId')?.setValue('c1');
    tick(600);
    expect(salesOrderService.getAllSalesOrder).toHaveBeenCalledWith(jasmine.objectContaining({ customerId: 'c1' }));
    expect(component.salesorders.length).toBe(1);
  }));

  it('salesOrderId selection navigates to the return route', fakeAsync(() => {
    create();
    component.salesOrderReturnForm.get('salesOrderId')?.setValue('so-7');
    expect(router.navigate).toHaveBeenCalledWith(['/sales-order-return', 'so-7']);
  }));

  it('edit mode loads return items and patches the form with payment selection flag', fakeAsync(() => {
    create({ salesorder: makeExistingOrder() }, { returnItems: [makeReturnItem()] });
    expect(component.isEdit).toBeTrue();
    expect(component.salesOrderForm.get('orderNumber')?.value).toBe('SO-9');
    expect(component.salesOrderForm.get('isSelectPaymentMethod')?.value).toBeTrue();
    expect(component.salesOrderItemsArray.length).toBe(1);
    const item = component.salesOrderItemsArray.at(0);
    expect(item.get('unitPrice')?.value).toBe(100);
    expect(item.get('returnquantity')?.value).toBe(0);
  }));

  it('return quantity is capped at quantity minus already returned quantities', fakeAsync(() => {
    create({ salesorder: makeExistingOrder() }, { returnItems: [makeReturnItem()] });
    const item = component.salesOrderItemsArray.at(0);
    item.patchValue({ returnquantity: 5 });
    expect(item.get('returnquantity')?.errors?.['max']?.max).toBe(3);
    item.patchValue({ returnquantity: 3 });
    expect(item.get('returnquantity')?.errors).toBeNull();
  }));

  it('payment selection flag is false when nothing is paid', fakeAsync(() => {
    salesOrderService.getSalesOrderByIdReturnItems.and.returnValue(of([makeReturnItem()]));
    create({ salesorder: makeExistingOrder({ totalPaidAmount: 0 }) });
    expect(component.salesOrderForm.get('isSelectPaymentMethod')?.value).toBeFalse();
  }));

  it('getAllTotal computes return totals with per-unit discount proration', fakeAsync(() => {
    create({ salesorder: makeExistingOrder() }, { returnItems: [makeReturnItem()] });
    component.salesOrderItemsArray.at(0).patchValue({ returnquantity: 2 });
    component.getAllTotal();
    // 2 x 100 = 200; fixed 5 over 4 units -> (5/4)*2 = 2.5 -> 197.5 -> +10% = 217.25 -> floor 217
    expect(component.totalBeforeDiscount).toBe(200);
    expect(component.totalDiscount).toBe(2.5);
    expect(component.totalTax).toBe(19.75);
    expect(component.grandTotal).toBe(217);
    expect(component.totalRoundOff).toBe(0.25);
  }));

  it('getAllTotal ignores items without a return quantity', fakeAsync(() => {
    create({ salesorder: makeExistingOrder() }, { returnItems: [makeReturnItem()] });
    component.getAllTotal();
    expect(component.grandTotal).toBe(0);
  }));

  it('flat discount subtracts from the grand total', fakeAsync(() => {
    salesOrderService.getSalesOrderByIdReturnItems.and.returnValue(of([makeReturnItem()]));
    create({ salesorder: makeExistingOrder({ flatDiscount: 10 }) }, { returnItems: [makeReturnItem()] });
    component.salesOrderItemsArray.at(0).patchValue({ returnquantity: 2 });
    component.getAllTotal();
    expect(component.grandTotal).toBe(207);
    expect(component.totalDiscount).toBe(12.5);
  }));

  it('onRemoveSalesOrderItem removes the row and recomputes', fakeAsync(() => {
    const twoItems = [makeReturnItem(), makeReturnItem({ productId: 'p2', product: makeProduct({ id: 'p2' }) })];
    create({ salesorder: makeExistingOrder() }, { returnItems: twoItems });
    component.onRemoveSalesOrderItem(0);
    expect(component.salesOrderItemsArray.length).toBe(1);
    expect(component.salesOrderItemsArray.at(0).get('productId')?.value).toBe('p2');
  }));

  it('invalid submit marks all controls touched', fakeAsync(() => {
    create({ salesorder: makeExistingOrder() }, { returnItems: [makeReturnItem()] });
    // force invalid: return quantity exceeds the prorated max (3)
    component.salesOrderItemsArray.at(0).patchValue({ returnquantity: 10 });
    component.onSalesOrderSubmit();
    expect(component.salesOrderForm.touched).toBeTrue();
    expect(returnStoreStub.addUpdateSalesOrderReturn).not.toHaveBeenCalled();
  }));

  it('submit without any return quantity errors please-select-item-return', fakeAsync(() => {
    create({ salesorder: makeExistingOrder() }, { returnItems: [makeReturnItem()] });
    component.onSalesOrderSubmit();
    expect(toastrService.error).toHaveBeenCalled();
    expect(returnStoreStub.addUpdateSalesOrderReturn).not.toHaveBeenCalled();
  }));

  it('already returned orders cannot be returned again', fakeAsync(() => {
    salesOrderService.getSalesOrderByIdReturnItems.and.returnValue(of([makeReturnItem()]));
    create({ salesorder: makeExistingOrder({ salesOrderStatus: SalesOrderStatusEnum.Return }) }, { returnItems: [makeReturnItem()] });
    component.salesOrderItemsArray.at(0).patchValue({ returnquantity: 2 });
    component.onSalesOrderSubmit();
    expect(toastrService.error).toHaveBeenCalled();
    expect(returnStoreStub.addUpdateSalesOrderReturn).not.toHaveBeenCalled();
  }));

  it('valid submit saves the return through the store with prorated payload', fakeAsync(() => {
    create({ salesorder: makeExistingOrder() }, { returnItems: [makeReturnItem()] });
    component.salesOrderItemsArray.at(0).patchValue({ returnquantity: 2 });
    component.getAllTotal();
    component.onSalesOrderSubmit();
    expect(returnStoreStub.addUpdateSalesOrderReturn).toHaveBeenCalledTimes(1);
    const saved = returnStoreStub.addUpdateSalesOrderReturn.calls.mostRecent().args[0] as SalesOrder;
    expect(saved.id).toBe('so-9');
    expect(saved.salesOrderStatus).toBe(SalesOrderStatusEnum.Return);
    expect(saved.totalAmount).toBe(217);
    const item = saved.salesOrderItems[0];
    expect(item.quantity).toBe(2);
    expect(item.discount).toBe(2.5);
    expect(item.taxValue).toBe(19.75);
    expect(item.discountPercentage).toBe(2.5);
    expect(item.salesOrderItemTaxes[0].taxId).toBe('t1');
    expect(item.salesOrderItemTaxes[0].taxValue as unknown).toBe('19.75');
  }));

  it('store add/update completion reloads sales orders and navigates to the return list', fakeAsync(() => {
    create();
    isAddUpdateSignal.set(true);
    fixture.detectChanges();
    flush();
    expect(salesOrderStoreStub.loadSalesOrderFromReturn).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/sales-order-return/list']);
  }));

  it('cancel navigates back', fakeAsync(() => {
    create();
    const loc = TestBed.inject(Location);
    spyOn(loc, 'back');
    component.cancel();
    expect(loc.back).toHaveBeenCalled();
  }));

  it('getSubTotalAfterDiscount prorates fixed discounts over the return quantity', fakeAsync(() => {
    create();
    expect(component.getSubTotalAfterDiscount(5, 'fixed', 4, 2)).toBe(2.5);
    expect(component.getSubTotalAfterDiscount(10, 'percentage', 4, 2)).toBe(10);
  }));
});
