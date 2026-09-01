import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { CustomerSalesOrderListComponent } from './customer-sales-order-list.component';
import { CustomerSalesOrderService } from '../customer-sales-order.service';
import { CustomerService } from '../../customer/customer.service';
import { CommonService } from '@core/services/common.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { CustomerSalesOrder } from './customer-sales-order';
import { PaymentStatus, PaymentStatusEnum } from '@core/domain-classes/paymentaStatus';

describe('CustomerSalesOrderListComponent', () => {
  let component: CustomerSalesOrderListComponent;
  let fixture: ComponentFixture<CustomerSalesOrderListComponent>;
  let customerSalesOrderService: jasmine.SpyObj<CustomerSalesOrderService>;
  let customerService: jasmine.SpyObj<CustomerService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let router: Router;

  const orders: CustomerSalesOrder[] = [
    { customerId: 'c1', customerName: 'Coke', totalPendingAmount: 100, paymentStatus: PaymentStatusEnum.Paid as unknown as PaymentStatus },
    { customerId: 'c2', customerName: 'Pepsi', totalPendingAmount: 250, paymentStatus: PaymentStatusEnum.Partial as unknown as PaymentStatus },
  ];

  function paginated<T>(body: T[], header: Record<string, number> = {}): HttpResponse<T[]> {
    return new HttpResponse({
      body,
      headers: new HttpHeaders({
        'X-Pagination': JSON.stringify({ totalCount: body.length, pageSize: 30, skip: 0, ...header }),
      }),
    });
  }

  beforeEach(async () => {
    customerSalesOrderService = jasmine.createSpyObj<CustomerSalesOrderService>('CustomerSalesOrderService', ['getAllCustomerSalesOrder', 'getCustomerSalesOrderPayments']);
    customerService = jasmine.createSpyObj<CustomerService>('CustomerService', ['getCustomersForDropDown']);
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getPageHelperText']);
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open', 'closeAll']);

    await TestBed.configureTestingModule({
      imports: [CustomerSalesOrderListComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        CurrencyPipe,
        { provide: CustomerSalesOrderService, useValue: customerSalesOrderService },
        { provide: CustomerService, useValue: customerService },
        { provide: CommonService, useValue: commonService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialog, useValue: dialog },
        {
          provide: SecurityService,
          useValue: Object.assign(jasmine.createSpyObj('SecurityService', ['hasClaim']), { currencyCode: 'USD' }),
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  function create(): void {
    fixture = TestBed.createComponent(CustomerSalesOrderListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and load pending customer sales orders on init', fakeAsync(() => {
    customerSalesOrderService.getAllCustomerSalesOrder.and.returnValue(of(paginated(orders, { totalCount: 77 })));
    create();
    tick(400);
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(customerSalesOrderService.getAllCustomerSalesOrder).toHaveBeenCalledOnceWith(jasmine.objectContaining({ pageSize: 30, skip: 0, orderBy: 'soCreatedDate desc' }));
    expect(component.customerSalesOrderStore.customerSalesOrders().length).toBe(2);
    expect(component.customerSalesOrderStore.customerSalesOrderResourceParameter().totalCount).toBe(77);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('Coke');
    expect(text).toContain('Pepsi');
    expect(component.paginator.length).toBe(77);
  }));

  it('order number filter reloads with orderNumber and reset skip', fakeAsync(() => {
    customerSalesOrderService.getAllCustomerSalesOrder.and.returnValues(of(paginated(orders)), of(paginated(orders)));
    create();
    tick(400);
    component.OrderNumberFilter = 'SO-9';
    tick(1400);
    const args = customerSalesOrderService.getAllCustomerSalesOrder.calls.mostRecent().args[0];
    expect(args.orderNumber).toBe('SO-9');
    expect(args.skip).toBe(0);
    expect(component.paginator.pageIndex).toBe(0);
  }));

  it('payment status filter reloads with paymentStatus', fakeAsync(() => {
    customerSalesOrderService.getAllCustomerSalesOrder.and.returnValues(of(paginated(orders)), of(paginated(orders)));
    create();
    tick(400);
    component.PaymentStatusFilter = '2';
    tick(1400);
    const args = customerSalesOrderService.getAllCustomerSalesOrder.calls.mostRecent().args[0];
    expect(args.paymentStatus).toBe('2');
  }));

  it('customer name filter reloads with customerName', fakeAsync(() => {
    customerSalesOrderService.getAllCustomerSalesOrder.and.returnValues(of(paginated(orders)), of(paginated(orders)));
    create();
    tick(400);
    component.CustomerFilter = 'Coke';
    tick(1400);
    const args = customerSalesOrderService.getAllCustomerSalesOrder.calls.mostRecent().args[0];
    expect(args.customerName).toBe('Coke');
  }));

  it('customer autocomplete searches customers after debounce', fakeAsync(() => {
    customerSalesOrderService.getAllCustomerSalesOrder.and.returnValue(of(paginated(orders)));
    customerService.getCustomersForDropDown.and.returnValue(of([{ id: 'c1', customerName: 'Coke' } as any]));
    create();
    tick(400);
    let found: any[] = [];
    component.customerList$.subscribe((c) => (found = c));
    component.customerNameControl.setValue('co');
    tick(1400);
    expect(customerService.getCustomersForDropDown).toHaveBeenCalledWith('co');
    expect(found.length).toBe(1);
    expect(found[0].customerName).toBe('Coke');
  }));

  it('sort change reloads with sort order and resets page index', fakeAsync(() => {
    customerSalesOrderService.getAllCustomerSalesOrder.and.returnValues(of(paginated(orders)), of(paginated(orders)));
    create();
    tick(400);
    component.paginator.pageIndex = 2;
    component.sort.active = 'totalPendingAmount';
    component.sort.direction = 'asc';
    component.sort.sortChange.emit({ active: 'totalPendingAmount', direction: 'asc' } as Sort);
    tick(400);
    const args = customerSalesOrderService.getAllCustomerSalesOrder.calls.mostRecent().args[0];
    expect(args.orderBy).toBe('totalPendingAmount asc');
    expect(args.skip).toBe(0);
    expect(component.paginator.pageIndex).toBe(0);
  }));

  it('paginator page reloads with computed skip and page size', fakeAsync(() => {
    customerSalesOrderService.getAllCustomerSalesOrder.and.returnValues(of(paginated(orders)), of(paginated(orders)));
    create();
    tick(400);
    component.paginator.pageIndex = 1;
    component.paginator.pageSize = 20;
    component.paginator.page.emit({ pageIndex: 1, pageSize: 20, length: 77 } as PageEvent);
    tick(400);
    const args = customerSalesOrderService.getAllCustomerSalesOrder.calls.mostRecent().args[0];
    expect(args.skip).toBe(20);
    expect(args.pageSize).toBe(20);
  }));

  it('refresh reloads through the store', fakeAsync(() => {
    customerSalesOrderService.getAllCustomerSalesOrder.and.returnValues(of(paginated(orders)), of(paginated(orders)));
    create();
    tick(400);
    component.refresh();
    tick(400);
    expect(customerSalesOrderService.getAllCustomerSalesOrder.calls.count()).toBe(2);
  }));

  it('toggleRow expands then collapses expanded element', fakeAsync(() => {
    customerSalesOrderService.getAllCustomerSalesOrder.and.returnValue(of(paginated(orders)));
    customerSalesOrderService.getCustomerSalesOrderPayments.and.returnValue(of([]));
    create();
    tick(400);
    component.toggleRow(orders[0]);
    expect(component.expandedElement).toBe(orders[0]);
    component.toggleRow(orders[0]);
    expect(component.expandedElement).toBeNull();
  }));

  it('addPendingPayment opens ledger dialog and reloads on close', fakeAsync(() => {
    customerSalesOrderService.getAllCustomerSalesOrder.and.returnValues(of(paginated(orders)), of(paginated(orders)));
    create();
    tick(400);
    dialog.open.and.returnValue({ afterClosed: () => of(true) } as any);
    component.addPendingPayment(orders[0]);
    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({ data: { customerId: 'c1' } }));
    tick(400);
    expect(customerSalesOrderService.getAllCustomerSalesOrder.calls.count()).toBe(2);
  }));

  it('addPendingPayment without element opens dialog with null customer and reload skipped on dismiss', fakeAsync(() => {
    customerSalesOrderService.getAllCustomerSalesOrder.and.returnValue(of(paginated(orders)));
    create();
    tick(400);
    dialog.open.and.returnValue({ afterClosed: () => of(false) } as any);
    component.addPendingPayment(null);
    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({ data: { customerId: undefined } }));
    tick(400);
    expect(customerSalesOrderService.getAllCustomerSalesOrder.calls.count()).toBe(1);
  }));

  it('clearDates nulls both date filters and reloads without dates', fakeAsync(() => {
    customerSalesOrderService.getAllCustomerSalesOrder.and.returnValues(of(paginated(orders)), of(paginated(orders)), of(paginated(orders)));
    create();
    tick(400);
    component.FromDateFilter = new Date('2026-01-01T00:00:00Z');
    tick(1400);
    component.clearDates();
    tick(2400);
    const args = customerSalesOrderService.getAllCustomerSalesOrder.calls.mostRecent().args[0];
    expect(args.fromDate).toBeNull();
    expect(args.toDate).toBeNull();
  }));

  it('response without pagination header leaves store empty but component usable', fakeAsync(() => {
    customerSalesOrderService.getAllCustomerSalesOrder.and.returnValue(of(new HttpResponse<CustomerSalesOrder[]>({ body: orders })));
    create();
    tick(400);
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.customerSalesOrderStore.customerSalesOrders().length).toBe(0);
  }));

  it('load error is caught by store and component stays usable', fakeAsync(() => {
    customerSalesOrderService.getAllCustomerSalesOrder.and.returnValue(throwError(() => ({ message: 'boom' })));
    create();
    tick(400);
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.customerSalesOrderStore.customerSalesOrders().length).toBe(0);
  }));
});
