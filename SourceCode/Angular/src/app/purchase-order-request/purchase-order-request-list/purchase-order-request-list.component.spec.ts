import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideRouter, Router } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { of, Subject } from 'rxjs';

import { PurchaseOrderRequestListComponent } from './purchase-order-request-list.component';
import { PurchaseOrderRequestStore } from '../purchase-order-request-store';
import { PurchaseOrderService } from '../../purchase-order/purchase-order.service';
import { SupplierService } from '../../supplier/supplier.service';
import { CommonService } from '@core/services/common.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';

describe('PurchaseOrderRequestListComponent', () => {
  let component: PurchaseOrderRequestListComponent;
  let fixture: ComponentFixture<PurchaseOrderRequestListComponent>;
  let loadByQuery: jasmine.Spy;
  let deletePurchaseOrderById: jasmine.Spy;
  let resource: any;
  let rows: PurchaseOrder[];
  let purchaseOrderService: jasmine.SpyObj<PurchaseOrderService>;
  let supplierService: jasmine.SpyObj<SupplierService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let dialog: any;
  let router: Router;

  function makeRow(overrides: Partial<PurchaseOrder> = {}): PurchaseOrder {
    return {
      id: 'r1', orderNumber: 'POR-1', status: 0, supplierName: 'Acme Supplies',
      totalAmount: 500, poCreatedDate: '2026-01-01T00:00:00Z',
      ...overrides,
    } as unknown as PurchaseOrder;
  }

  beforeEach(async () => {
    resource = {
      orderNumber: '', supplierName: '', supplierId: '', fromDate: null, toDate: null,
      deliveryStatus: '', paymentStatus: '', locationId: '', pageSize: 30,
      orderBy: 'poCreatedDate asc', fields: '', searchQuery: '', skip: 0, totalCount: 0,
      isPurchaseOrderRequest: true,
    };
    rows = [makeRow(), makeRow({ id: 'r2', orderNumber: 'POR-2', supplierName: 'Bulk Corp' })];
    loadByQuery = jasmine.createSpy('loadByQuery');
    deletePurchaseOrderById = jasmine.createSpy('deletePurchaseOrderById');
    purchaseOrderService = jasmine.createSpyObj<PurchaseOrderService>('PurchaseOrderService', ['getPurchaseOrderById', 'getPurchaseOrderItems']);
    supplierService = jasmine.createSpyObj<SupplierService>('SupplierService', ['getSuppliersForDropDown']);
    commonDialogService = jasmine.createSpyObj<CommonDialogService>('CommonDialogService', ['deleteConformationDialog']);
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    const translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new Subject<string>().asObservable();

    await TestBed.configureTestingModule({
      imports: [PurchaseOrderRequestListComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        CurrencyPipe,
        provideNativeDateAdapter(),
        { provide: PurchaseOrderRequestStore, useValue: { purchaseOrderResourceParameter: () => resource, isLoading: () => false, purchaseOrders: () => rows, loadByQuery, deletePurchaseOrderById } },
        { provide: PurchaseOrderService, useValue: purchaseOrderService },
        { provide: SupplierService, useValue: supplierService },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: CommonDialogService, useValue: commonDialogService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: SecurityService, useValue: Object.assign(jasmine.createSpyObj('SecurityService', ['hasClaim']), { currencyCode: 'USD', companyProfile: new Subject<any>().asObservable() }) },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  function create(): void {
    supplierService.getSuppliersForDropDown.and.returnValue(of([]));
    purchaseOrderService.getPurchaseOrderItems.and.returnValue(of([]));
    fixture = TestBed.createComponent(PurchaseOrderRequestListComponent);
    component = fixture.componentInstance;
    dialog = (component as any).dialog;
    spyOn(dialog, 'open').and.returnValue({ afterClosed: () => of(false) } as any);
    fixture.detectChanges();
  }

  it('should create and parse store orderBy', fakeAsync(() => {
    create();
    tick(1000);
    expect(component).toBeTruthy();
    expect(component.orderByColumn).toBe('poCreatedDate');
    expect(component.orderByDirection).toBe('asc');
  }));

  it('supplier and order number filters push debounced queries with reset skip', fakeAsync(() => {
    create();
    tick(1000);
    component.SupplierFilter = 'Acme';
    tick(1000);
    let sent = loadByQuery.calls.mostRecent().args[0];
    expect(sent.supplierName).toBe('Acme');
    expect(sent.skip).toBe(0);
    component.OrderNumberFilter = 'POR-9';
    tick(1000);
    sent = loadByQuery.calls.mostRecent().args[0];
    expect(sent.orderNumber).toBe('POR-9');
  }));

  it('sort resets page index and reloads with sort order', fakeAsync(() => {
    create();
    tick(1000);
    component.paginator.pageIndex = 2;
    component.sort.active = 'orderNumber';
    component.sort.direction = 'desc';
    component.sort.sortChange.emit({ active: 'orderNumber', direction: 'desc' } as Sort);
    const sent = loadByQuery.calls.mostRecent().args[0];
    expect(sent.orderBy).toBe('orderNumber desc');
    expect(component.paginator.pageIndex).toBe(0);
  }));

  it('paginator page reloads with computed skip and page size', fakeAsync(() => {
    create();
    tick(1000);
    let observed: any = null;
    loadByQuery.and.callFake((r: any) => { observed = { skip: r.skip, pageSize: r.pageSize }; });
    component.paginator.pageIndex = 1;
    component.paginator.pageSize = 20;
    component.paginator.page.emit({ pageIndex: 1, pageSize: 20, length: 42 } as PageEvent);
    expect(observed).toEqual({ skip: 20, pageSize: 20 });
  }));

  it('refresh reloads with current resource', fakeAsync(() => {
    create();
    tick(1000);
    loadByQuery.calls.reset();
    component.refresh();
    expect(loadByQuery).toHaveBeenCalledWith(component.purchaseOrderResource);
  }));

  it('toggleRow expands, collapses and poChangeEvent toggles', fakeAsync(() => {
    create();
    tick(1000);
    component.toggleRow(rows[0]);
    expect(component.expandedElement).toBe(rows[0]);
    component.poChangeEvent(rows[0]);
    expect(component.expandedElement).toBeNull();
  }));

  it('delete confirmed delegates to store by id and declined does not', fakeAsync(() => {
    create();
    tick(1000);
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    component.deletePurchaseOrder(rows[0]);
    expect(deletePurchaseOrderById).toHaveBeenCalledWith('r1');
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    component.deletePurchaseOrder(rows[0]);
    expect(deletePurchaseOrderById).toHaveBeenCalledTimes(1);
  }));

  it('convertToPurchaseOrder navigates to add route with request id query param', fakeAsync(() => {
    create();
    tick(1000);
    component.convertToPurchaseOrder(rows[0]);
    expect(router.navigate).toHaveBeenCalledWith(['purchase-order/add'], { queryParams: { 'purchase-order-requestId': 'r1' } });
  }));

  it('onDetailPurchaseOrder navigates to request detail route', fakeAsync(() => {
    create();
    tick(1000);
    component.onDetailPurchaseOrder(rows[0]);
    expect(router.navigate).toHaveBeenCalledWith(['/purchase-order-request', 'r1']);
  }));

  it('generateInvoice and sendEmail load the order and flag email mode', fakeAsync(() => {
    purchaseOrderService.getPurchaseOrderById.and.returnValue(of(makeRow()));
    create();
    tick(1000);
    component.generateInvoice(rows[0]);
    expect(purchaseOrderService.getPurchaseOrderById).toHaveBeenCalledWith('r1');
    expect(component.purchaseOrderForInvoice).toBeTruthy();
    expect(component.isSendEmail).toBe(false);
    component.sendEmail(rows[0]);
    expect(component.isSendEmail).toBe(true);
  }));

  it('supplier autocomplete control searches suppliers after debounce', fakeAsync(() => {
    supplierService.getSuppliersForDropDown.and.returnValue(of([{ id: 's1', supplierName: 'Acme' } as any]));
    create();
    tick(1000);
    component.supplierNameControl.setValue('Acm');
    tick(1000);
    expect(supplierService.getSuppliersForDropDown).toHaveBeenCalledWith('Acm');
  }));

  it('getDataIndex resolves row positions from the store rows', fakeAsync(() => {
    create();
    tick(1000);
    expect(component.getDataIndex(rows[1])).toBe(1);
    expect(component.isOddDataRow(1)).toBeTrue();
    expect(component.isOddDataRow(0)).toBeFalse();
  }));
});
