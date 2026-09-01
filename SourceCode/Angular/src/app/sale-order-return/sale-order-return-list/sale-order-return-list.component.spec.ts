import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideRouter, Router } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { of, Subject } from 'rxjs';

import { SaleOrderReturnListComponent } from './sale-order-return-list.component';
import { SalesOrderReturnStore } from '../sale-order-return-store';
import { SalesOrderService } from '../../sales-order/sales-order.service';
import { SalesOrderPaymentService } from '../../sales-order/sales-order-payment.service';
import { PurchaseOrderPaymentService } from '../../purchase-order/purchase-order-payment.service';
import { CustomerService } from '../../customer/customer.service';
import { CommonService } from '@core/services/common.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { SalesOrder } from '@core/domain-classes/sales-order';

describe('SaleOrderReturnListComponent', () => {
  let component: SaleOrderReturnListComponent;
  let fixture: ComponentFixture<SaleOrderReturnListComponent>;
  let loadByQuery: jasmine.Spy;
  let deleteSalesOrderById: jasmine.Spy;
  let resource: any;
  let rows: SalesOrder[];
  let salesOrderService: jasmine.SpyObj<SalesOrderService>;
  let customerService: jasmine.SpyObj<CustomerService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let dialog: any;
  let router: Router;

  function makeRow(overrides: Partial<SalesOrder> = {}): SalesOrder {
    return {
      id: 'so1', orderNumber: 'SO-1', status: 1, paymentStatus: 1, customerName: 'Coke',
      totalAmount: 100, totalPaidAmount: 0, modifiedDate: '2026-01-02T00:00:00Z',
      ...overrides,
    } as unknown as SalesOrder;
  }

  beforeEach(async () => {
    resource = {
      orderNumber: '', customerName: '', customerId: '', fromDate: null, toDate: null,
      deliveryStatus: null, paymentStatus: null, locationId: '', pageSize: 30,
      orderBy: 'modifiedDate asc', fields: '', searchQuery: '', skip: 0, totalCount: 0,
      status: 4,
    };
    rows = [makeRow(), makeRow({ id: 'so2', orderNumber: 'SO-2', customerName: 'Pepsi' })];
    loadByQuery = jasmine.createSpy('loadByQuery');
    deleteSalesOrderById = jasmine.createSpy('deleteSalesOrderById');
    salesOrderService = jasmine.createSpyObj<SalesOrderService>('SalesOrderService', ['getSalesOrderById', 'getSalesOrderItems']);
    customerService = jasmine.createSpyObj<CustomerService>('CustomerService', ['getCustomersForDropDown']);
    commonDialogService = jasmine.createSpyObj<CommonDialogService>('CommonDialogService', ['deleteConformationDialog']);
    const toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    const translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new Subject<string>().asObservable();

    await TestBed.configureTestingModule({
      imports: [SaleOrderReturnListComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        CurrencyPipe,
        provideNativeDateAdapter(),
        { provide: SalesOrderReturnStore, useValue: { salesOrderResourceParameter: () => resource, isLoading: () => false, salesOrders: () => rows, loadByQuery, deleteSalesOrderById } },
        { provide: SalesOrderService, useValue: salesOrderService },
        { provide: SalesOrderPaymentService, useValue: jasmine.createSpyObj('SalesOrderPaymentService', ['addSalesOrderPayments', 'getAllSalesOrderPaymentById', 'deleteSalesOrderPayment']) },
        { provide: PurchaseOrderPaymentService, useValue: jasmine.createSpyObj('PurchaseOrderPaymentService', ['getPaymentMethod']) },
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
    fixture = TestBed.createComponent(SaleOrderReturnListComponent);
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

  it('customer and order number filters push debounced queries with reset skip', fakeAsync(() => {
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
    component.paginator.pageIndex = 2;
    component.paginator.pageSize = 25;
    component.paginator.page.emit({ pageIndex: 2, pageSize: 25, length: 90 } as PageEvent);
    expect(observed).toEqual({ skip: 50, pageSize: 25 });
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
    expect(deleteSalesOrderById).toHaveBeenCalledWith('so1');
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    component.deleteSalesOrder(rows[0]);
    expect(deleteSalesOrderById).toHaveBeenCalledTimes(1);
  }));

  it('addPayment opens dialog and reloads only on confirmed close', fakeAsync(() => {
    create();
    tick(1000);
    loadByQuery.calls.reset();
    (dialog.open as jasmine.Spy).and.returnValue({ afterClosed: () => of(true) } as any);
    component.addPayment(rows[0]);
    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({ data: jasmine.objectContaining({ id: 'so1' }) }));
    expect(loadByQuery).toHaveBeenCalledWith(component.salesOrderResource);
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

  it('generateInvoice loads the return order by id', fakeAsync(() => {
    salesOrderService.getSalesOrderById.and.returnValue(of(makeRow()));
    create();
    tick(1000);
    component.generateInvoice(rows[0]);
    expect(salesOrderService.getSalesOrderById).toHaveBeenCalledWith('so1');
    expect(component.salesOrderForInvoice).toBeTruthy();
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
