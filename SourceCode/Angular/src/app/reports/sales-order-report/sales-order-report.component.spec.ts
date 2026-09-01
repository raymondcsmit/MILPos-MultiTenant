import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { BehaviorSubject, of } from 'rxjs';

import { SalesOrderReportComponent } from './sales-order-report.component';
import { SalesOrderService } from '../../sales-order/sales-order.service';
import { CustomerService } from '../../customer/customer.service';
import { ProductService } from '../../product/product.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { SalesOrder } from '@core/domain-classes/sales-order';
import { SalesOrderItem } from '@core/domain-classes/sales-order-item';

describe('SalesOrderReportComponent', () => {
  let component: SalesOrderReportComponent;
  let fixture: ComponentFixture<SalesOrderReportComponent>;
  let salesOrderService: jasmine.SpyObj<SalesOrderService>;
  let customerService: jasmine.SpyObj<CustomerService>;
  let productService: jasmine.SpyObj<ProductService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;

  const orders: SalesOrder[] = [
    {
      id: 'so1',
      orderNumber: 'SO-1',
      customerName: 'Coke',
      soCreatedDate: new Date('2026-01-05T00:00:00Z'),
      deliveryDate: new Date('2026-01-07T00:00:00Z'),
      totalDiscount: 1,
      totalTax: 2,
      totalAmount: 100,
      totalPaidAmount: 50,
      paymentStatus: 1,
      status: 0,
    } as unknown as SalesOrder,
    {
      id: 'so2',
      orderNumber: 'SO-2',
      customerName: 'Pepsi',
      soCreatedDate: new Date('2026-01-06T00:00:00Z'),
      deliveryDate: new Date('2026-01-08T00:00:00Z'),
      totalDiscount: 0,
      totalTax: 3,
      totalAmount: 200,
      totalPaidAmount: 200,
      paymentStatus: 2,
      status: 1,
    } as unknown as SalesOrder,
  ];

  function paginated(body: SalesOrder[]): HttpResponse<SalesOrder[]> {
    return new HttpResponse({
      body,
      headers: new HttpHeaders({
        'X-Pagination': JSON.stringify({ totalCount: body.length, pageSize: 50, skip: 0 }),
      }),
    });
  }

  beforeEach(() => {
    salesOrderService = jasmine.createSpyObj<SalesOrderService>('SalesOrderService', [
      'getAllSalesOrder',
      'getAllSalesOrderExcel',
      'getSalesOrderItems',
    ]);
    customerService = jasmine.createSpyObj<CustomerService>('CustomerService', ['getCustomersForDropDown']);
    productService = jasmine.createSpyObj<ProductService>('ProductService', ['getProductsDropdown']);
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getLocationsForReport']);
    commonService.getLocationsForReport.and.returnValue(of({ locations: [{ id: 'loc1', name: 'Main' } as any], selectedLocation: 'loc1' } as any));
    productService.getProductsDropdown.and.returnValue(of([]));
    salesOrderService.getSalesOrderItems.and.returnValue(of([]));
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    const securityService = jasmine.createSpyObj('SecurityService', ['hasClaim']);
    (securityService as any).currencyCode = 'USD';
    securityService.hasClaim.and.returnValue(true);

    TestBed.configureTestingModule({
      imports: [SalesOrderReportComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideNativeDateAdapter(),
        CurrencyPipe,
        { provide: SalesOrderService, useValue: salesOrderService },
        { provide: CustomerService, useValue: customerService },
        { provide: ProductService, useValue: productService },
        { provide: CommonService, useValue: commonService },
        { provide: SecurityService, useValue: securityService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialog, useValue: dialog },
      ],
    });
  });

  function create(): void {
    salesOrderService.getAllSalesOrder.and.returnValue(of(paginated(orders)));
    fixture = TestBed.createComponent(SalesOrderReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and load orders for the selected location on init', fakeAsync(() => {
    create();
    expect(component).toBeTruthy();
    expect(salesOrderService.getAllSalesOrder).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({ locationId: 'loc1', pageSize: 50, skip: 0, orderBy: 'soCreatedDate asc' })
    );
    expect(component.salesOrders.length).toBe(2);
    expect(component.searchForm.get('locationId')?.value).toBe('loc1');
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('SO-1');
    expect(text).toContain('Coke');
  }));

  it('customer and order number filters debounce into the resource and reset skip', fakeAsync(() => {
    create();
    salesOrderService.getAllSalesOrder.calls.reset();
    component.CustomerFilter = 'ali';
    tick(1000);
    let args = salesOrderService.getAllSalesOrder.calls.mostRecent().args[0];
    expect(args.customerName).toBe('ali');
    expect(args.skip).toBe(0);
    expect(component.paginator.pageIndex).toBe(0);

    component.OrderNumberFilter = 'SO-9';
    tick(1000);
    args = salesOrderService.getAllSalesOrder.calls.mostRecent().args[0];
    expect(args.orderNumber).toBe('SO-9');
  }));

  it('onSearch copies form filters and skips reload when date range is invalid', fakeAsync(() => {
    create();
    salesOrderService.getAllSalesOrder.calls.reset();
    component.searchForm.patchValue({
      fromDate: new Date(2026, 0, 1),
      toDate: new Date(2026, 0, 31),
      productId: 'p1',
      locationId: 'loc2',
    });
    component.onSearch();
    const args = salesOrderService.getAllSalesOrder.calls.mostRecent().args[0];
    expect(args.productId).toBe('p1');
    expect(args.locationId).toBe('loc2');

    salesOrderService.getAllSalesOrder.calls.reset();
    component.searchForm.patchValue({ fromDate: new Date(2026, 1, 1), toDate: new Date(2026, 0, 1) });
    expect(component.searchForm.valid).toBeFalse();
    component.onSearch();
    expect(salesOrderService.getAllSalesOrder).not.toHaveBeenCalled();
  }));

  it('onClear resets the form and reloads with the first location', fakeAsync(() => {
    create();
    component.searchForm.patchValue({ productId: 'p1' });
    component.onSearch();
    component.onClear();
    expect(component.searchForm.get('productId')?.value).toBeNull();
    const args = salesOrderService.getAllSalesOrder.calls.mostRecent().args[0];
    expect(args.locationId).toBe('loc1');
    expect(args.productId).toBeNull();
  }));

  it('sort and page handlers recompute orderBy and skip', fakeAsync(() => {
    create();
    salesOrderService.getAllSalesOrder.and.returnValue(of(new HttpResponse({ body: orders })));
    salesOrderService.getAllSalesOrder.calls.reset();
    component.sort.active = 'orderNumber';
    component.sort.direction = 'desc';
    component.sort.sortChange.emit({ active: 'orderNumber', direction: 'desc' } as Sort);
    let args = salesOrderService.getAllSalesOrder.calls.mostRecent().args[0];
    expect(args.orderBy).toBe('orderNumber desc');
    expect(args.skip).toBe(0);

    component.paginator.pageIndex = 3;
    component.paginator.pageSize = 20;
    component.paginator.page.emit({ pageIndex: 3, pageSize: 20, length: 100 } as PageEvent);
    args = salesOrderService.getAllSalesOrder.calls.mostRecent().args[0];
    expect(args.skip).toBe(60);
    expect(args.pageSize).toBe(20);
  }));

  it('toggleRow expands the order and renders the items child which loads its items', fakeAsync(() => {
    salesOrderService.getSalesOrderItems.and.returnValue(
      of([{ id: 'i1', productId: 'p1', productName: 'Aspirin', unitPrice: 10, quantity: 2, discount: 0, taxValue: 1, salesOrderItemTaxes: [] } as unknown as SalesOrderItem])
    );
    create();
    expect(salesOrderService.getSalesOrderItems).not.toHaveBeenCalled();
    component.toggleRow(component.salesOrders[0]);
    expect(component.expandedElement).toBe(component.salesOrders[0]);
    fixture.detectChanges();
    expect(salesOrderService.getSalesOrderItems).toHaveBeenCalledWith('so1');
    const child = fixture.nativeElement.querySelector('app-sales-order-items');
    expect(child).toBeTruthy();
    expect(child.textContent).toContain('Aspirin');

    component.toggleRow(component.salesOrders[0]);
    expect(component.expandedElement).toBeNull();
  }));

  it('onDownloadReport reports no data when the loaded report is empty', fakeAsync(() => {
    create();
    component.salesOrderResource.totalCount = 0;
    component.onDownloadReport('pdf');
    expect(toastrService.error).toHaveBeenCalledWith('TRANSLATED');
    expect(salesOrderService.getAllSalesOrderExcel).not.toHaveBeenCalled();
  }));

  it('onDownloadReport email path fetches all orders and opens the send-email dialog', fakeAsync(() => {
    create();
    salesOrderService.getAllSalesOrderExcel.and.returnValue(of(paginated(orders)));
    const realDialog = (component as any).dialog;
    spyOn(realDialog, 'open').and.returnValue({ afterClosed: () => of(void 0) } as any);
    component.onDownloadReport('email');
    const args = salesOrderService.getAllSalesOrderExcel.calls.mostRecent().args[0];
    expect(args.pageSize).toBe(50);
    expect(realDialog.open).toHaveBeenCalledWith(
      jasmine.anything(),
      jasmine.objectContaining({
        data: jasmine.objectContaining({ name: 'TRANSLATED.pdf', contentType: 'application/pdf' }),
      })
    );
  }));
});
