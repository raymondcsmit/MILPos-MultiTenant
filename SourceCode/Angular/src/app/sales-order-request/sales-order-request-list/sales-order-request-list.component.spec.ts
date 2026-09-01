import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideRouter, Router } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { of, Subject } from 'rxjs';

import { SalesOrderRequestListComponent } from './sales-order-request-list.component';
import { SalesOrderRequestStore } from '../sales-order-request-store';
import { SalesOrderService } from '../../sales-order/sales-order.service';
import { CustomerService } from '../../customer/customer.service';
import { CommonService } from '@core/services/common.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { SalesOrder } from '@core/domain-classes/sales-order';

describe('SalesOrderRequestListComponent', () => {
  let component: SalesOrderRequestListComponent;
  let fixture: ComponentFixture<SalesOrderRequestListComponent>;
  let loadByQuery: jasmine.Spy;
  let deleteSalesOrderById: jasmine.Spy;
  let resource: any;
  let rows: SalesOrder[];
  let salesOrderService: jasmine.SpyObj<SalesOrderService>;
  let customerService: jasmine.SpyObj<CustomerService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let dialog: any;
  let router: Router;

  const visibleColumns = [
    { key: 'action' },
    { key: 'soCreatedDate' },
    { key: 'orderNumber' },
    { key: 'customerName' },
    { key: 'totalAmount' },
  ];


  function makeRow(overrides: Partial<SalesOrder> = {}): SalesOrder {
    return {
      id: 'r1', orderNumber: 'SOR-1', status: 0, customerName: 'Coke',
      totalAmount: 100, soCreatedDate: '2026-01-01T00:00:00Z',
      ...overrides,
    } as unknown as SalesOrder;
  }

  beforeEach(async () => {
    resource = {
      orderNumber: '', customerName: '', customerId: '', fromDate: null, toDate: null,
      deliveryStatus: null, paymentStatus: null, locationId: '', pageSize: 30,
      orderBy: 'soCreatedDate asc', fields: '', searchQuery: '', skip: 0, totalCount: 0,
      isSalesOrderRequest: true,
    };
    rows = [makeRow(), makeRow({ id: 'r2', orderNumber: 'SOR-2', customerName: 'Pepsi' })];
    loadByQuery = jasmine.createSpy('loadByQuery');
    deleteSalesOrderById = jasmine.createSpy('deleteSalesOrderById');
    salesOrderService = jasmine.createSpyObj<SalesOrderService>('SalesOrderService', ['getSalesOrderById', 'getSalesOrderItems']);
    customerService = jasmine.createSpyObj<CustomerService>('CustomerService', ['getCustomersForDropDown']);
    commonDialogService = jasmine.createSpyObj<CommonDialogService>('CommonDialogService', ['deleteConformationDialog']);
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    const translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new Subject<string>().asObservable();

    await TestBed.configureTestingModule({
      imports: [SalesOrderRequestListComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        CurrencyPipe,
        provideNativeDateAdapter(),
        { provide: SalesOrderRequestStore, useValue: { salesOrderResourceParameter: () => resource, isLoading: () => false, salesOrders: () => rows, loadByQuery, deleteSalesOrderById } },
        { provide: SalesOrderService, useValue: salesOrderService },
        { provide: CustomerService, useValue: customerService },
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
    customerService.getCustomersForDropDown.and.returnValue(of([]));
    salesOrderService.getSalesOrderItems.and.returnValue(of([]));
    fixture = TestBed.createComponent(SalesOrderRequestListComponent);
    component = fixture.componentInstance;
    dialog = (component as any).dialog;
    spyOn(dialog, 'open').and.returnValue({ afterClosed: () => of(false) } as any);
    fixture.detectChanges();
  }

  it('should create and parse store orderBy', fakeAsync(() => {
    create();
    tick(1000);
    expect(component).toBeTruthy();
    expect(component.orderByColumn).toBe('soCreatedDate');
    expect(component.orderByDirection).toBe('asc');
  }));

  it('customer and order number filters push debounced queries with reset skip', fakeAsync(() => {
    create();
    tick(1000);
    component.CustomerFilter = 'Coke';
    tick(1000);
    let sent = loadByQuery.calls.mostRecent().args[0];
    expect(sent.customerName).toBe('Coke');
    expect(sent.skip).toBe(0);
    component.OrderNumberFilter = 'SOR-9';
    tick(1000);
    sent = loadByQuery.calls.mostRecent().args[0];
    expect(sent.orderNumber).toBe('SOR-9');
  }));

  it('sort resets page index and reloads with sort order', fakeAsync(() => {
    create();
    tick(1000);
    component.paginator.pageIndex = 3;
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

  it('delete confirmed delegates to store by id and declined does not', fakeAsync(() => {
    create();
    tick(1000);
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    component.deleteSalesOrder(rows[0]);
    expect(deleteSalesOrderById).toHaveBeenCalledWith('r1');
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    component.deleteSalesOrder(rows[0]);
    expect(deleteSalesOrderById).toHaveBeenCalledTimes(1);
  }));

  it('editSalesOrder navigates to request manage route', fakeAsync(() => {
    create();
    tick(1000);
    component.editSalesOrder(rows[0]);
    expect(router.navigate).toHaveBeenCalledWith(['sales-order-request/', 'r1']);
  }));

  it('convertToSalesOrder navigates to add route with request id query param', fakeAsync(() => {
    create();
    tick(1000);
    component.convertToSalesOrder(rows[0]);
    expect(router.navigate).toHaveBeenCalledWith(['sales-order/add'], { queryParams: { 'sales-order-requestId': 'r1' } });
  }));

  it('generateInvoice and sendEmail load the order and flag email mode', fakeAsync(() => {
    salesOrderService.getSalesOrderById.and.returnValue(of(makeRow()));
    create();
    tick(1000);
    component.generateInvoice(rows[0]);
    expect(salesOrderService.getSalesOrderById).toHaveBeenCalledWith('r1');
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
