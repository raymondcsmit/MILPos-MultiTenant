import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideRouter, Router } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { of, Subject } from 'rxjs';

import { PurchaseOrderReturnListComponent } from './purchase-order-return-list.component';
import { PurchaseOrderReturnStore } from '../purchase-order-request-store';
import { PurchaseOrderService } from '../../purchase-order/purchase-order.service';
import { PurchaseOrderPaymentService } from '../../purchase-order/purchase-order-payment.service';
import { SupplierService } from '../../supplier/supplier.service';
import { CommonService } from '@core/services/common.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';

describe('PurchaseOrderReturnListComponent', () => {
  let component: PurchaseOrderReturnListComponent;
  let fixture: ComponentFixture<PurchaseOrderReturnListComponent>;
  let loadByQuery: jasmine.Spy;
  let deletePurchaseOrderById: jasmine.Spy;
  let resource: any;
  let rows: PurchaseOrder[];
  let purchaseOrderService: jasmine.SpyObj<PurchaseOrderService>;
  let supplierService: jasmine.SpyObj<SupplierService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let dialog: any;
  let router: Router;

  function makeRow(overrides: Partial<PurchaseOrder> = {}): PurchaseOrder {
    return {
      id: 'po1', orderNumber: 'PO-1', status: 1, paymentStatus: 1, supplierName: 'Acme Supplies',
      totalAmount: 500, totalPaidAmount: 0, modifiedDate: '2026-01-02T00:00:00Z',
      ...overrides,
    } as unknown as PurchaseOrder;
  }

  beforeEach(async () => {
    resource = {
      orderNumber: '', supplierName: '', supplierId: '', fromDate: null, toDate: null,
      deliveryStatus: '', paymentStatus: '', locationId: '', pageSize: 30,
      orderBy: 'modifiedDate asc', fields: '', searchQuery: '', skip: 0, totalCount: 0,
      status: 4,
    };
    rows = [makeRow(), makeRow({ id: 'po2', orderNumber: 'PO-2', supplierName: 'Bulk Corp' })];
    loadByQuery = jasmine.createSpy('loadByQuery');
    deletePurchaseOrderById = jasmine.createSpy('deletePurchaseOrderById');
    purchaseOrderService = jasmine.createSpyObj<PurchaseOrderService>('PurchaseOrderService', ['getPurchaseOrderById', 'getPurchaseOrderItems']);
    supplierService = jasmine.createSpyObj<SupplierService>('SupplierService', ['getSuppliersForDropDown']);
    commonDialogService = jasmine.createSpyObj<CommonDialogService>('CommonDialogService', ['deleteConformationDialog']);
    const toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    const translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new Subject<string>().asObservable();

    await TestBed.configureTestingModule({
      imports: [PurchaseOrderReturnListComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        CurrencyPipe,
        provideNativeDateAdapter(),
        { provide: PurchaseOrderReturnStore, useValue: { purchaseOrderResourceParameter: () => resource, isLoading: () => false, purchaseOrders: () => rows, loadByQuery, deletePurchaseOrderById } },
        { provide: PurchaseOrderService, useValue: purchaseOrderService },
        { provide: PurchaseOrderPaymentService, useValue: jasmine.createSpyObj('PurchaseOrderPaymentService', ['getPaymentMethod', 'addPurchaseOrderPayments', 'getAllPurchaseOrderPaymentById', 'deletePurchaseOrderPayment']) },
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
    fixture = TestBed.createComponent(PurchaseOrderReturnListComponent);
    component = fixture.componentInstance;
    dialog = (component as any).dialog;
    spyOn(dialog, 'open').and.returnValue({ afterClosed: () => of(false) } as any);
    fixture.detectChanges();
  }

  it('should create and parse store orderBy', fakeAsync(() => {
    create();
    tick(1000);
    expect(component).toBeTruthy();
    expect(component.orderByColumn).toBe('modifiedDate');
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
    component.OrderNumberFilter = 'PO-9';
    tick(1000);
    sent = loadByQuery.calls.mostRecent().args[0];
    expect(sent.orderNumber).toBe('PO-9');
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

  it('toggleRow expands and collapses the row', fakeAsync(() => {
    create();
    tick(1000);
    component.toggleRow(rows[0]);
    expect(component.expandedElement).toBe(rows[0]);
    component.toggleRow(rows[0]);
    expect(component.expandedElement).toBeNull();
  }));

  it('delete confirmed delegates to store by id and declined does not', fakeAsync(() => {
    create();
    tick(1000);
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    component.deletePurchaseOrder(rows[0]);
    expect(deletePurchaseOrderById).toHaveBeenCalledWith('po1');
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    component.deletePurchaseOrder(rows[0]);
    expect(deletePurchaseOrderById).toHaveBeenCalledTimes(1);
  }));

  it('addPayment opens dialog and reloads only on confirmed close', fakeAsync(() => {
    create();
    tick(1000);
    loadByQuery.calls.reset();
    (dialog.open as jasmine.Spy).and.returnValue({ afterClosed: () => of(true) } as any);
    component.addPayment(rows[0]);
    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({ data: jasmine.objectContaining({ id: 'po1' }) }));
    expect(loadByQuery).toHaveBeenCalledWith(component.purchaseOrderResource);
  }));

  it('viewPayment opens view dialog with a copy of the order', fakeAsync(() => {
    create();
    tick(1000);
    component.viewPayment(rows[0]);
    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({ data: jasmine.objectContaining({ id: 'po1' }) }));
  }));

  it('OnPurchaseOrderReturn navigates to return route with order id', fakeAsync(() => {
    create();
    tick(1000);
    component.OnPurchaseOrderReturn(rows[0]);
    expect(router.navigate).toHaveBeenCalledWith(['/purchase-order-return', 'po1']);
  }));

  it('generateInvoice loads the return order by id', fakeAsync(() => {
    purchaseOrderService.getPurchaseOrderById.and.returnValue(of(makeRow()));
    create();
    tick(1000);
    component.generateInvoice(rows[0]);
    expect(purchaseOrderService.getPurchaseOrderById).toHaveBeenCalledWith('po1');
    expect(component.purchaseOrderForInvoice).toBeTruthy();
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
