import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideRouter, Router } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';
import { PageEvent } from '@angular/material/paginator';
import { of, Subject } from 'rxjs';

import { PurchaseOrderListComponent } from './purchase-order-list.component';
import { PurchaseOrderStore } from '../purchase-order-store';
import { TableSettingsStore } from '../../table-setting/table-setting-store';
import { PurchaseOrderService } from '../purchase-order.service';
import { PurchaseOrderPaymentService } from '../purchase-order-payment.service';
import { SupplierService } from '../../supplier/supplier.service';
import { CommonService } from '@core/services/common.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';

describe('PurchaseOrderListComponent', () => {
  let component: PurchaseOrderListComponent;
  let fixture: ComponentFixture<PurchaseOrderListComponent>;
  let loadByQuery: jasmine.Spy;
  let deletePurchaseOrderById: jasmine.Spy;
  let markAsReceived: jasmine.Spy;
  let resource: any;
  let rows: PurchaseOrder[];
  let purchaseOrderService: jasmine.SpyObj<PurchaseOrderService>;
  let supplierService: jasmine.SpyObj<SupplierService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let dialog: any;
  let router: Router;

  const visibleColumns = [
    { key: 'action' },
    { key: 'poCreatedDate' },
    { key: 'orderNumber' },
    { key: 'supplierName' },
    { key: 'totalAmount' },
    { key: 'paymentStatus' },
  ];

  function makeRow(overrides: Partial<PurchaseOrder> = {}): PurchaseOrder {
    return {
      id: 'po1', orderNumber: 'PO-1', status: 0, paymentStatus: 1, deliveryStatus: 0,
      supplierName: 'Acme Supplies', totalAmount: 500, totalPaidAmount: 200, poCreatedDate: '2026-01-01T00:00:00Z',
      ...overrides,
    } as unknown as PurchaseOrder;
  }

  beforeEach(async () => {
    resource = {
      orderNumber: '', supplierName: '', supplierId: '', fromDate: null, toDate: null,
      deliveryStatus: '', paymentStatus: '', locationId: '', pageSize: 30,
      orderBy: 'orderNumber desc', fields: '', searchQuery: '', skip: 0, totalCount: 0,
    };
    rows = [makeRow(), makeRow({ id: 'po2', orderNumber: 'PO-2', supplierName: 'Bulk Corp' })];
    loadByQuery = jasmine.createSpy('loadByQuery');
    deletePurchaseOrderById = jasmine.createSpy('deletePurchaseOrderById');
    markAsReceived = jasmine.createSpy('markAsReceived');
    purchaseOrderService = jasmine.createSpyObj<PurchaseOrderService>('PurchaseOrderService', ['getPurchaseOrderById', 'getPurchaseOrderItems']);
    supplierService = jasmine.createSpyObj<SupplierService>('SupplierService', ['getSuppliersForDropDown']);
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getLocationsForReport', 'getPageHelperText']);
    commonService.getLocationsForReport.and.returnValue(of({ locations: [{ id: 'l1', name: 'Main' }] } as any));
    commonDialogService = jasmine.createSpyObj<CommonDialogService>('CommonDialogService', ['deleteConformationDialog']);
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    const translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new Subject<string>().asObservable();

    await TestBed.configureTestingModule({
      imports: [PurchaseOrderListComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        CurrencyPipe,
        provideNativeDateAdapter(),
        { provide: PurchaseOrderStore, useValue: { purchaseOrderResourceParameter: () => resource, isLoading: () => false, purchaseOrders: () => rows, loadByQuery, deletePurchaseOrderById, markAsReceived } },
        { provide: TableSettingsStore, useValue: { purchaseOrdersTableSettingsVisible: () => visibleColumns } },
        { provide: PurchaseOrderService, useValue: purchaseOrderService },
        { provide: PurchaseOrderPaymentService, useValue: jasmine.createSpyObj('PurchaseOrderPaymentService', ['getPaymentMethod', 'addPurchaseOrderPayments', 'getAllPurchaseOrderPaymentById', 'deletePurchaseOrderPayment']) },
        { provide: SupplierService, useValue: supplierService },
        { provide: CommonService, useValue: commonService },
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
    fixture = TestBed.createComponent(PurchaseOrderListComponent);
    component = fixture.componentInstance;
    dialog = (component as any).dialog;
    spyOn(dialog, 'open').and.returnValue({ afterClosed: () => of(false) } as any);
    fixture.detectChanges();
  }

  it('should create and parse store orderBy and load locations', fakeAsync(() => {
    create();
    tick(1000);
    expect(component).toBeTruthy();
    expect(component.orderByColumn).toBe('orderNumber');
    expect(component.orderByDirection).toBe('desc');
    expect(component.locations.length).toBe(1);
    expect(component.visibleTableKeys).toEqual(['action', 'poCreatedDate', 'orderNumber', 'supplierName', 'totalAmount', 'paymentStatus']);
  }));

  it('supplier and order number filters push debounced queries', fakeAsync(() => {
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

  it('purchase status, payment status and location filters push resource keys', fakeAsync(() => {
    create();
    tick(1000);
    component.purchaseStatusFilter = '1';
    tick(1000);
    expect(loadByQuery.calls.mostRecent().args[0].deliveryStatus).toBe('1');
    component.paymentStatusFilter = '2';
    tick(1000);
    expect(loadByQuery.calls.mostRecent().args[0].paymentStatus).toBe('2');
    component.locationFilter = 'l1';
    tick(1000);
    expect(loadByQuery.calls.mostRecent().args[0].locationId).toBe('l1');
  }));

  it('date filters parse dates and clearOrderDates resets both bounds', fakeAsync(() => {
    create();
    tick(1000);
    component.OrderFromDateFilter = new Date('2026-03-01T00:00:00Z');
    tick(1000);
    let sent = loadByQuery.calls.mostRecent().args[0];
    expect(sent.fromDate).toEqual(new Date('2026-03-01T00:00:00Z'));
    component.OrderToDateFilter = new Date('2026-03-31T00:00:00Z');
    tick(1000);
    sent = loadByQuery.calls.mostRecent().args[0];
    expect(sent.toDate).toEqual(new Date('2026-03-31T00:00:00Z'));
    component.clearOrderDates();
    tick(1000);
    sent = loadByQuery.calls.mostRecent().args[0];
    expect(sent.fromDate).toBeNull();
    expect(sent.toDate).toBeNull();
  }));

  it('sort and page events reload with merged resource', fakeAsync(() => {
    create();
    tick(1000);
    component.sort.active = 'orderNumber';
    component.sort.direction = 'asc';
    component.sort.sortChange.emit();
    let sent = loadByQuery.calls.mostRecent().args[0];
    expect(sent.orderBy).toBe('orderNumber asc');
    component.paginator.pageIndex = 2;
    component.paginator.pageSize = 50;
    component.paginator.page.emit({ pageIndex: 2, pageSize: 50, length: 120 } as PageEvent);
    sent = loadByQuery.calls.mostRecent().args[0];
    expect(sent.skip).toBe(100);
    expect(sent.pageSize).toBe(50);
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
    expect(deletePurchaseOrderById).toHaveBeenCalledWith('po1');
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    component.deletePurchaseOrder(rows[0]);
    expect(deletePurchaseOrderById).toHaveBeenCalledTimes(1);
  }));

  it('markAsReceived confirmed delegates to store', fakeAsync(() => {
    create();
    tick(1000);
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    component.markAsReceived('po1');
    expect(markAsReceived).toHaveBeenCalledWith('po1');
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

  it('OnPurchaseOrderReturn navigates to return route', fakeAsync(() => {
    create();
    tick(1000);
    component.OnPurchaseOrderReturn(rows[0]);
    expect(router.navigate).toHaveBeenCalledWith(['/purchase-order-return', 'po1']);
  }));

  it('onTableRefresh navigates to table settings', fakeAsync(() => {
    create();
    tick(1000);
    component.onTableRefresh();
    expect(router.navigate).toHaveBeenCalledWith(['/table-settings/PurchaseOrders']);
  }));

  it('generateInvoice and sendEmail load the order and flag email mode', fakeAsync(() => {
    purchaseOrderService.getPurchaseOrderById.and.returnValue(of(makeRow()));
    create();
    tick(1000);
    component.generateInvoice(rows[0]);
    expect(purchaseOrderService.getPurchaseOrderById).toHaveBeenCalledWith('po1');
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
