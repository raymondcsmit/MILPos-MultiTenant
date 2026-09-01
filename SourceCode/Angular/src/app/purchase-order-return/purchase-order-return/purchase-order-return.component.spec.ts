import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe, Location } from '@angular/common';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';
import { signal } from '@angular/core';
import { BehaviorSubject, of, Subject } from 'rxjs';

import { PurchaseOrderReturnComponent } from './purchase-order-return.component';
import { SupplierService } from '../../supplier/supplier.service';
import { PurchaseOrderService } from '../../purchase-order/purchase-order.service';
import { CommonService } from '@core/services/common.service';
import { PurchaseOrderPaymentService } from '../../purchase-order/purchase-order-payment.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { PurchaseOrderReturnStore } from '../purchase-order-request-store';
import { PurchaseOrderStore } from '../../purchase-order/purchase-order-store';
import { HttpResponse } from '@angular/common/http';
import { Product } from '@core/domain-classes/product';
import { Tax } from '@core/domain-classes/tax';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';
import { PurchaseOrderItem } from '@core/domain-classes/purchase-order-item';
import { PurchaseOrderStatusEnum } from '@core/domain-classes/purchase-order-status';

describe('PurchaseOrderReturnComponent', () => {
  let component: PurchaseOrderReturnComponent;
  let fixture: ComponentFixture<PurchaseOrderReturnComponent>;
  let supplierService: jasmine.SpyObj<SupplierService>;
  let purchaseOrderService: jasmine.SpyObj<PurchaseOrderService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let paymentService: jasmine.SpyObj<PurchaseOrderPaymentService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let router: Router;
  let routeData$: BehaviorSubject<any>;
  let isAddUpdateSignal: ReturnType<typeof signal<boolean>>;
  let returnStoreStub: any;
  let purchaseOrderStoreStub: any;

  const tax: Tax = { id: 't1', name: 'GST', percentage: 10 } as Tax;
  const taxes: Tax[] = [tax];

  function makeProduct(overrides: Partial<Product> = {}): Product {
    return { id: 'p1', name: 'Flour', unitId: 'u1', purchasePrice: 100, ...overrides } as Product;
  }

  function makeReturnItem(overrides: Partial<PurchaseOrderItem> = {}): PurchaseOrderItem {
    return {
      productId: 'p1',
      unitId: 'u1',
      unitPrice: 100,
      quantity: 4,
      returnItemsQuantities: 1,
      discountPercentage: 5,
      discountType: 'fixed',
      product: makeProduct(),
      purchaseOrderItemTaxes: [{ taxId: 't1', tax: tax, taxValue: 0 }],
      ...overrides,
    } as unknown as PurchaseOrderItem;
  }

  function makeExistingOrder(overrides: any = {}): PurchaseOrder {
    return {
      id: 'po-9',
      orderNumber: 'PO-9',
      supplierId: 's1',
      locationId: 'l1',
      deliveryDate: '2026-08-01T00:00:00Z',
      poCreatedDate: '2026-08-01T10:00:00Z',
      deliveryStatus: 1,
      flatDiscount: 0,
      totalPaidAmount: 50,
      totalRefundAmount: 0,
      purchaseOrderItems: [],
      ...overrides,
    } as unknown as PurchaseOrder;
  }

  function ordersResponse(orders: PurchaseOrder[]): HttpResponse<PurchaseOrder[]> {
    return new HttpResponse({ body: orders });
  }

  beforeEach(async () => {
    routeData$ = new BehaviorSubject<any>({});
    isAddUpdateSignal = signal(false);
    returnStoreStub = {
      isAddUpdate: isAddUpdateSignal,
      addUpdatePurchaseOrder: jasmine.createSpy('addUpdatePurchaseOrder'),
    };
    purchaseOrderStoreStub = {
      loadPurchaseOrderFromReturn: jasmine.createSpy('loadPurchaseOrderFromReturn'),
    };
    supplierService = jasmine.createSpyObj<SupplierService>('SupplierService', ['getSuppliersForDropDown']);
    purchaseOrderService = jasmine.createSpyObj<PurchaseOrderService>('PurchaseOrderService', [
      'getAllPurchaseOrder', 'getPurchaseOrderByIdReturnItems',
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
      imports: [PurchaseOrderReturnComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        CurrencyPipe,
        provideNativeDateAdapter(),
        { provide: SupplierService, useValue: supplierService },
        { provide: PurchaseOrderService, useValue: purchaseOrderService },
        { provide: CommonService, useValue: commonService },
        { provide: PurchaseOrderPaymentService, useValue: paymentService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: SecurityService, useValue: securityService },
        { provide: PurchaseOrderReturnStore, useValue: returnStoreStub },
        { provide: PurchaseOrderStore, useValue: purchaseOrderStoreStub },
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

  function create(routeData: any = {}, opts: { returnItems?: PurchaseOrderItem[] } = {}): void {
    supplierService.getSuppliersForDropDown.and.returnValue(of([]));
    purchaseOrderService.getAllPurchaseOrder.and.returnValue(of(ordersResponse([])));
    purchaseOrderService.getPurchaseOrderByIdReturnItems.and.returnValue(of(opts.returnItems ?? []));
    commonService.getLocationsForCurrentUser.and.returnValue(of({ locations: [{ id: 'l1', name: 'Main' }], selectedLocation: 'l1' } as any));
    paymentService.getPaymentMethod.and.returnValue(of([{ id: 1 }] as any));
    fixture = TestBed.createComponent(PurchaseOrderReturnComponent);
    component = fixture.componentInstance;
    routeData$.next(routeData);
    fixture.detectChanges();
    tick(1100);
  }

  it('new return builds both forms and fetches returnable purchase orders', fakeAsync(() => {
    create();
    expect(component.purchaseOrderForm).toBeTruthy();
    expect(component.purchaseOrderReturnForm).toBeTruthy();
    expect(purchaseOrderService.getAllPurchaseOrder).toHaveBeenCalledWith(jasmine.objectContaining({ pageSize: 10, status: PurchaseOrderStatusEnum.Not_Return }));
    expect(component.paymentMethodslist.length).toBe(1);
  }));

  it('new return loads locations', fakeAsync(() => {
    create();
    expect(component.locations.length).toBe(1);
  }));

  it('supplier search on the return form populates suppliersForSearch', fakeAsync(() => {
    create();
    supplierService.getSuppliersForDropDown.calls.reset();
    supplierService.getSuppliersForDropDown.and.returnValue(of([{ id: 's1', supplierName: 'Sup' } as any]));
    component.purchaseOrderReturnForm.get('filerSupplier')?.setValue('Sup');
    tick(600);
    expect(supplierService.getSuppliersForDropDown).toHaveBeenCalledWith('Sup', '');
    expect(component.suppliersForSearch.length).toBe(1);
  }));

  it('order number filter fetches purchase orders by order number', fakeAsync(() => {
    create();
    purchaseOrderService.getAllPurchaseOrder.calls.reset();
    purchaseOrderService.getAllPurchaseOrder.and.returnValue(of(ordersResponse([{ id: 'po-1' } as PurchaseOrder])));
    component.purchaseOrderReturnForm.get('filerPurchaseOrder')?.setValue('PO-');
    tick(600);
    expect(purchaseOrderService.getAllPurchaseOrder).toHaveBeenCalledWith(jasmine.objectContaining({ orderNumber: 'PO-' }));
    expect(component.purchaseorders.length).toBe(1);
  }));

  it('supplier selection fetches that supplier\'s purchase orders', fakeAsync(() => {
    create();
    purchaseOrderService.getAllPurchaseOrder.calls.reset();
    purchaseOrderService.getAllPurchaseOrder.and.returnValue(of(ordersResponse([{ id: 'po-2' } as PurchaseOrder])));
    component.purchaseOrderReturnForm.get('supplierId')?.setValue('s1');
    tick(600);
    expect(purchaseOrderService.getAllPurchaseOrder).toHaveBeenCalledWith(jasmine.objectContaining({ supplierId: 's1' }));
    expect(component.purchaseorders.length).toBe(1);
  }));

  it('purchaseOrderId selection navigates to the return route', fakeAsync(() => {
    create();
    component.purchaseOrderReturnForm.get('purchaseOrderId')?.setValue('po-7');
    expect(router.navigate).toHaveBeenCalledWith(['/purchase-order-return', 'po-7']);
  }));

  it('edit mode loads return items and patches the form with payment selection flag', fakeAsync(() => {
    create({ purchaseorder: makeExistingOrder() }, { returnItems: [makeReturnItem()] });
    expect(component.purchaseOrderForm.get('orderNumber')?.value).toBe('PO-9');
    expect(component.purchaseOrderForm.get('isSelectPaymentMethod')?.value).toBeTrue();
    expect(component.purchaseOrderItemsArray.length).toBe(1);
    expect(component.purchaseOrderItemsArray.at(0).get('unitPrice')?.value).toBe(100);
  }));

  it('payment selection flag is false when nothing is paid', fakeAsync(() => {
    create({ purchaseorder: makeExistingOrder({ totalPaidAmount: 0 }) }, { returnItems: [makeReturnItem()] });
    expect(component.purchaseOrderForm.get('isSelectPaymentMethod')?.value).toBeFalse();
  }));

  it('return quantity is capped at quantity minus already returned quantities', fakeAsync(() => {
    create({ purchaseorder: makeExistingOrder() }, { returnItems: [makeReturnItem()] });
    const item = component.purchaseOrderItemsArray.at(0);
    item.patchValue({ returnquantity: 5 });
    expect(item.get('returnquantity')?.errors?.['max']?.max).toBe(3);
    item.patchValue({ returnquantity: 3 });
    expect(item.get('returnquantity')?.errors).toBeNull();
  }));

  it('getAllTotal computes return totals with per-unit discount proration', fakeAsync(() => {
    create({ purchaseorder: makeExistingOrder() }, { returnItems: [makeReturnItem()] });
    component.purchaseOrderItemsArray.at(0).patchValue({ returnquantity: 2 });
    component.getAllTotal();
    // 2 x 100 = 200; fixed 5 over 4 units -> (5/4)*2 = 2.5 -> 197.5 -> +10% = 217.25 -> floor 217
    expect(component.totalBeforeDiscount).toBe(200);
    expect(component.totalDiscount).toBe(2.5);
    expect(component.totalTax).toBe(19.75);
    expect(component.grandTotal).toBe(217);
    expect(component.totalRoundOff).toBe(0.25);
  }));

  it('getAllTotal ignores items without a return quantity', fakeAsync(() => {
    create({ purchaseorder: makeExistingOrder() }, { returnItems: [makeReturnItem()] });
    component.getAllTotal();
    expect(component.grandTotal).toBe(0);
  }));

  it('onAddAnotherProduct pushes an empty editable row', fakeAsync(() => {
    create({ purchaseorder: makeExistingOrder() }, { returnItems: [makeReturnItem()] });
    component.onAddAnotherProduct();
    expect(component.purchaseOrderItemsArray.length).toBe(2);
    expect(component.purchaseOrderItemsArray.at(1).get('productId')?.value).toBe('');
  }));

  it('onRemovePurchaseOrderItem removes the row and recomputes', fakeAsync(() => {
    const items = [makeReturnItem(), makeReturnItem({ productId: 'p2', product: makeProduct({ id: 'p2' }) })];
    create({ purchaseorder: makeExistingOrder() }, { returnItems: items });
    component.onRemovePurchaseOrderItem(0);
    expect(component.purchaseOrderItemsArray.length).toBe(1);
    expect(component.purchaseOrderItemsArray.at(0).get('productId')?.value).toBe('p2');
  }));

  it('invalid submit marks all controls touched', fakeAsync(() => {
    create({ purchaseorder: makeExistingOrder() }, { returnItems: [makeReturnItem()] });
    component.purchaseOrderItemsArray.at(0).patchValue({ returnquantity: 10 });
    component.onPurchaseOrderSubmit();
    expect(component.purchaseOrderForm.touched).toBeTrue();
    expect(returnStoreStub.addUpdatePurchaseOrder).not.toHaveBeenCalled();
  }));

  it('submit without any return quantity errors please-select-item-return', fakeAsync(() => {
    create({ purchaseorder: makeExistingOrder() }, { returnItems: [makeReturnItem()] });
    component.onPurchaseOrderSubmit();
    expect(toastrService.error).toHaveBeenCalled();
    expect(returnStoreStub.addUpdatePurchaseOrder).not.toHaveBeenCalled();
  }));

  it('already returned purchase orders cannot be returned again', fakeAsync(() => {
    create({ purchaseorder: makeExistingOrder({ purchaseOrderStatus: PurchaseOrderStatusEnum.Return }) }, { returnItems: [makeReturnItem()] });
    component.purchaseOrderItemsArray.at(0).patchValue({ returnquantity: 2 });
    component.onPurchaseOrderSubmit();
    expect(toastrService.error).toHaveBeenCalled();
    expect(returnStoreStub.addUpdatePurchaseOrder).not.toHaveBeenCalled();
  }));

  it('valid submit saves the return through the store with prorated payload', fakeAsync(() => {
    create({ purchaseorder: makeExistingOrder() }, { returnItems: [makeReturnItem()] });
    component.purchaseOrderItemsArray.at(0).patchValue({ returnquantity: 2 });
    component.getAllTotal();
    component.onPurchaseOrderSubmit();
    expect(returnStoreStub.addUpdatePurchaseOrder).toHaveBeenCalledTimes(1);
    const saved = returnStoreStub.addUpdatePurchaseOrder.calls.mostRecent().args[0] as PurchaseOrder;
    expect(saved.id).toBe('po-9');
    expect(saved.purchaseOrderStatus).toBe(PurchaseOrderStatusEnum.Return);
    expect(saved.totalAmount).toBe(217);
    const item = saved.purchaseOrderItems[0];
    expect(item.quantity).toBe(2);
    expect(item.discount).toBe(2.5);
    expect(item.taxValue).toBe(19.75);
    expect(item.discountPercentage).toBe(2.5);
    expect(item.purchaseOrderItemTaxes[0].taxId).toBe('t1');
    expect(item.purchaseOrderItemTaxes[0].taxValue as unknown).toBe('19.75');
  }));

  it('store add/update completion reloads purchase orders and navigates to the return list', fakeAsync(() => {
    create();
    isAddUpdateSignal.set(true);
    fixture.detectChanges();
    flush();
    expect(purchaseOrderStoreStub.loadPurchaseOrderFromReturn).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/purchase-order-return/list']);
  }));

  it('cancel navigates back', fakeAsync(() => {
    create();
    const loc = TestBed.inject(Location);
    spyOn(loc, 'back');
    component.cancel();
    expect(loc.back).toHaveBeenCalled();
  }));
});
