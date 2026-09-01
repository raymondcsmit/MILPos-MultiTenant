import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideRouter, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { provideNativeDateAdapter } from '@angular/material/core';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { of, Subject } from 'rxjs';

import { SalesOrderListComponent } from './sales-order-list.component';
import { SalesOrderStore } from '../sales-order-store';
import { TableSettingsStore } from '../../table-setting/table-setting-store';
import { SalesOrderService } from '../sales-order.service';
import { SalesOrderPaymentService } from '../sales-order-payment.service';
import { PurchaseOrderPaymentService } from '../../purchase-order/purchase-order-payment.service';
import { CustomerService } from '../../customer/customer.service';
import { CommonService } from '@core/services/common.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { SalesOrder } from '@core/domain-classes/sales-order';

describe('SalesOrderListComponent', () => {
  let component: SalesOrderListComponent;
  let fixture: ComponentFixture<SalesOrderListComponent>;
  let loadByQuery: jasmine.Spy;
  let deleteSalesOrderById: jasmine.Spy;
  let markAsDelivered: jasmine.Spy;
  let resource: any;
  let rows: SalesOrder[];
  let salesOrderService: jasmine.SpyObj<SalesOrderService>;
  let customerService: jasmine.SpyObj<CustomerService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let router: Router;

  const visibleColumns = [
    { key: 'action' },
    { key: 'soCreatedDate' },
    { key: 'orderNumber' },
    { key: 'customerName' },
    { key: 'totalAmount' },
    { key: 'paymentStatus' },
  ];

  function makeRow(overrides: Partial<SalesOrder> = {}): SalesOrder {
    return {
      id: 'so1', orderNumber: 'SO-1', status: 0, paymentStatus: 1, deliveryStatus: 0,
      customerName: 'Coke', totalAmount: 100, totalPaidAmount: 50, soCreatedDate: '2026-01-01T00:00:00Z',
      ...overrides,
    } as unknown as SalesOrder;
  }

  beforeEach(async () => {
    resource = {
      orderNumber: '', customerName: '', customerId: '', fromDate: null, toDate: null,
      deliveryStatus: null, paymentStatus: null, locationId: '', pageSize: 30,
      orderBy: 'soCreatedDate desc', fields: '', searchQuery: '', skip: 0, totalCount: 0,
    };
    rows = [makeRow(), makeRow({ id: 'so2', orderNumber: 'SO-2', customerName: 'Pepsi' })];
    loadByQuery = jasmine.createSpy('loadByQuery');
    deleteSalesOrderById = jasmine.createSpy('deleteSalesOrderById');
    markAsDelivered = jasmine.createSpy('markAsDelivered');
    salesOrderService = jasmine.createSpyObj<SalesOrderService>('SalesOrderService', ['getSalesOrderById', 'getSalesOrderItems']);
    customerService = jasmine.createSpyObj<CustomerService>('CustomerService', ['getCustomersForDropDown']);
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getLocationsForReport', 'getPageHelperText']);
    commonService.getLocationsForReport.and.returnValue(of({ locations: [{ id: 'l1', name: 'Main' }] } as any));
    commonDialogService = jasmine.createSpyObj<CommonDialogService>('CommonDialogService', ['deleteConformationDialog']);
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open', 'closeAll']);
    const translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new Subject<string>().asObservable();

    await TestBed.configureTestingModule({
      imports: [SalesOrderListComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        CurrencyPipe,
        provideNativeDateAdapter(),
        { provide: SalesOrderStore, useValue: { salesOrderResourceParameter: () => resource, isLoading: () => false, salesOrders: () => rows, loadByQuery, deleteSalesOrderById, markAsDelivered } },
        { provide: TableSettingsStore, useValue: { saleOrdersTableSettingsVisible: () => visibleColumns } },
        { provide: SalesOrderService, useValue: salesOrderService },
        { provide: CustomerService, useValue: customerService },
        { provide: CommonService, useValue: commonService },
        { provide: CommonDialogService, useValue: commonDialogService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: SecurityService, useValue: Object.assign(jasmine.createSpyObj('SecurityService', ['hasClaim']), { currencyCode: 'USD', companyProfile: new Subject<any>().asObservable() }) },
        { provide: SalesOrderPaymentService, useValue: jasmine.createSpyObj('SalesOrderPaymentService', ['addSalesOrderPayments', 'getAllSalesOrderPaymentById', 'deleteSalesOrderPayment']) },
        { provide: PurchaseOrderPaymentService, useValue: jasmine.createSpyObj('PurchaseOrderPaymentService', ['getPaymentMethod', 'deletePurchaseOrderPayment']) },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  function create(): void {
    customerService.getCustomersForDropDown.and.returnValue(of([]));
    salesOrderService.getSalesOrderItems.and.returnValue(of([]));
    fixture = TestBed.createComponent(SalesOrderListComponent);
    component = fixture.componentInstance;
    dialog = (component as any).dialog;
    spyOn(dialog, 'open').and.returnValue({ afterClosed: () => of(false) } as any);
    fixture.detectChanges();
  }

  it('should create and parse store orderBy and load locations', fakeAsync(() => {
    create();
    tick(1000);
    expect(component).toBeTruthy();
    expect(component.orderByColumn).toBe('soCreatedDate');
    expect(component.orderByDirection).toBe('desc');
    expect(component.locations.length).toBe(1);
    expect(component.visibleTableKeys).toEqual(['action', 'soCreatedDate', 'orderNumber', 'customerName', 'totalAmount', 'paymentStatus']);
  }));

  it('customer and order number filters push debounced queries', fakeAsync(() => {
    create();
    tick(1000);
    component.CustomerFilter = 'Coke';
    tick(1000);
    let sent = loadByQuery.calls.mostRecent().args[0];
    expect(sent.customerName).toBe('Coke');
    expect(sent.skip).toBe(0);
    component.OrderNumberFilter = 'SO-9';
    tick(1000);
    sent = loadByQuery.calls.mostRecent().args[0];
    expect(sent.orderNumber).toBe('SO-9');
  }));

  it('delivery, payment and location filters push their resource keys', fakeAsync(() => {
    create();
    tick(1000);
    component.deliveryStatusFilter = '1';
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
    component.OrderFromDateFilter = new Date('2026-02-01T00:00:00Z');
    tick(1000);
    let sent = loadByQuery.calls.mostRecent().args[0];
    expect(sent.fromDate).toEqual(new Date('2026-02-01T00:00:00Z'));
    component.OrderToDateFilter = new Date('2026-02-28T00:00:00Z');
    tick(1000);
    sent = loadByQuery.calls.mostRecent().args[0];
    expect(sent.toDate).toEqual(new Date('2026-02-28T00:00:00Z'));
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
    expect(sent.skip).toBe(0);
    component.paginator.pageIndex = 1;
    component.paginator.pageSize = 50;
    component.paginator.page.emit({ pageIndex: 1, pageSize: 50, length: 100 } as PageEvent);
    sent = loadByQuery.calls.mostRecent().args[0];
    expect(sent.skip).toBe(50);
    expect(sent.pageSize).toBe(50);
  }));

  it('refresh reloads with current resource', fakeAsync(() => {
    create();
    tick(1000);
    loadByQuery.calls.reset();
    component.refresh();
    expect(loadByQuery).toHaveBeenCalledWith(component.salesOrderResource);
  }));

  it('toggleRow expands and collapses the row', fakeAsync(() => {
    create();
    tick(1000);
    component.toggleRow(rows[0]);
    expect(component.expandedElement).toBe(rows[0]);
    component.toggleRow(rows[0]);
    expect(component.expandedElement).toBeNull();
  }));

  it('delete confirmed delegates to store by id', fakeAsync(() => {
    create();
    tick(1000);
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    component.deleteSalesOrder(rows[0]);
    expect(commonDialogService.deleteConformationDialog).toHaveBeenCalled();
    expect(deleteSalesOrderById).toHaveBeenCalledWith('so1');
  }));

  it('declined delete does not call store', fakeAsync(() => {
    create();
    tick(1000);
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    component.deleteSalesOrder(rows[0]);
    expect(deleteSalesOrderById).not.toHaveBeenCalled();
  }));

  it('markAsDelivered confirmed delegates to store', fakeAsync(() => {
    create();
    tick(1000);
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    component.markAsDelivered('so1');
    expect(markAsDelivered).toHaveBeenCalledWith('so1');
  }));

  it('addPayment opens dialog and reloads on confirmed close', fakeAsync(() => {
    create();
    tick(1000);
    (dialog.open as jasmine.Spy).and.returnValue({ afterClosed: () => of(true) } as any);
    component.addPayment(rows[0]);
    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({ data: jasmine.objectContaining({ id: 'so1' }) }));
    expect(loadByQuery).toHaveBeenCalledWith(component.salesOrderResource);
  }));

  it('addPayment dismissed close does not reload', fakeAsync(() => {
    create();
    tick(1000);
    loadByQuery.calls.reset();
    component.addPayment(rows[0]);
    expect(loadByQuery).not.toHaveBeenCalled();
  }));

  it('viewPayment opens view dialog with a copy of the order', fakeAsync(() => {
    create();
    tick(1000);
    component.viewPayment(rows[0]);
    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({ data: jasmine.objectContaining({ id: 'so1' }) }));
  }));

  it('onSaleOrderReturn navigates to return route with order id', fakeAsync(() => {
    create();
    tick(1000);
    component.onSaleOrderReturn(rows[0]);
    expect(router.navigate).toHaveBeenCalledWith(['sales-order-return', 'so1']);
  }));

  it('onTableRefresh navigates to table settings', fakeAsync(() => {
    create();
    tick(1000);
    component.onTableRefresh();
    expect(router.navigate).toHaveBeenCalledWith(['/table-settings/SaleOrders']);
  }));

  it('generateInvoice and sendEmail load the order and flag email mode', fakeAsync(() => {
    salesOrderService.getSalesOrderById.and.returnValue(of(makeRow()));
    create();
    tick(1000);
    component.generateInvoice(rows[0]);
    expect(salesOrderService.getSalesOrderById).toHaveBeenCalledWith('so1');
    expect(component.salesOrderForInvoice).toBeTruthy();
    expect(component.isSendEmail).toBe(false);
    component.sendEmail(rows[0]);
    expect(component.isSendEmail).toBe(true);
  }));

  it('customer autocomplete control searches customers after debounce', fakeAsync(() => {
    customerService.getCustomersForDropDown.and.returnValue(of([{ id: 'c1', customerName: 'Coke' } as any]));
    create();
    tick(1000);
    component.customerNameControl.setValue('Cok');
    tick(1000);
    expect(customerService.getCustomersForDropDown).toHaveBeenCalledWith('Cok');
  }));

  it('getDataIndex resolves row positions from the store rows', fakeAsync(() => {
    create();
    tick(1000);
    expect(component.getDataIndex(rows[1])).toBe(1);
    expect(component.isOddDataRow(1)).toBeTrue();
    expect(component.isOddDataRow(0)).toBeFalse();
  }));
});
