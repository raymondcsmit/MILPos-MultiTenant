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

import { ProductSalesReportComponent } from './product-sales-report.component';
import { SalesOrderService } from '../../sales-order/sales-order.service';
import { CustomerService } from '../../customer/customer.service';
import { ProductService } from '../../product/product.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { SalesOrderItem } from '@core/domain-classes/sales-order-item';

describe('ProductSalesReportComponent', () => {
  let component: ProductSalesReportComponent;
  let fixture: ComponentFixture<ProductSalesReportComponent>;
  let salesOrderService: jasmine.SpyObj<SalesOrderService>;
  let customerService: jasmine.SpyObj<CustomerService>;
  let productService: jasmine.SpyObj<ProductService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;

  const items: SalesOrderItem[] = [
    {
      productId: 'p1',
      productName: 'Aspirin',
      salesOrderNumber: 'SO-1',
      customerName: 'Coke',
      soCreatedDate: new Date('2026-01-05T00:00:00Z'),
      unitName: 'Box',
      unitPrice: 10,
      quantity: 2,
      discount: 1,
      taxValue: 2,
      salesOrderItemTaxes: [{ taxName: 'GST', taxPercentage: 5 } as any],
    } as unknown as SalesOrderItem,
    {
      productId: 'p2',
      productName: 'Bandage',
      salesOrderNumber: 'SO-2',
      customerName: 'Pepsi',
      soCreatedDate: new Date('2026-01-06T00:00:00Z'),
      unitName: 'Pack',
      unitPrice: 5,
      quantity: 3,
      discount: 0,
      taxValue: 1,
      salesOrderItemTaxes: [],
    } as unknown as SalesOrderItem,
  ];

  function paginated(body: SalesOrderItem[]): HttpResponse<SalesOrderItem[]> {
    return new HttpResponse({
      body,
      headers: new HttpHeaders({
        'X-Pagination': JSON.stringify({ totalCount: body.length, pageSize: 50, skip: 0 }),
      }),
    });
  }

  function plain(body: SalesOrderItem[]): HttpResponse<SalesOrderItem[]> {
    return new HttpResponse({ body });
  }

  beforeEach(() => {
    salesOrderService = jasmine.createSpyObj<SalesOrderService>('SalesOrderService', ['getSalesOrderItemReport']);
    customerService = jasmine.createSpyObj<CustomerService>('CustomerService', ['getCustomersForDropDown']);
    productService = jasmine.createSpyObj<ProductService>('ProductService', ['getProductsDropdown']);
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getLocationsForReport']);
    commonService.getLocationsForReport.and.returnValue(of({ locations: [{ id: 'loc1', name: 'Main' } as any], selectedLocation: 'loc1' } as any));
    productService.getProductsDropdown.and.returnValue(of([]));
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    const securityService = jasmine.createSpyObj('SecurityService', ['hasClaim']);
    (securityService as any).currencyCode = 'USD';
    securityService.hasClaim.and.returnValue(true);

    TestBed.configureTestingModule({
      imports: [ProductSalesReportComponent, TranslateModule.forRoot()],
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
    salesOrderService.getSalesOrderItemReport.and.returnValue(of(paginated(items)));
    fixture = TestBed.createComponent(ProductSalesReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and load items for the selected location on init', fakeAsync(() => {
    create();
    expect(component).toBeTruthy();
    expect(salesOrderService.getSalesOrderItemReport).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({ locationId: 'loc1', pageSize: 50, skip: 0, orderBy: 'soCreatedDate asc' })
    );
    expect(component.salesOrderItems.length).toBe(2);
    expect(component.searchForm.get('locationId')?.value).toBe('loc1');
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('Aspirin');
    expect(text).toContain('SO-2');
    expect(productService.getProductsDropdown).toHaveBeenCalled();
  }));

  it('customer and order number filters debounce into the resource and reset skip', fakeAsync(() => {
    create();
    salesOrderService.getSalesOrderItemReport.calls.reset();
    component.CustomerFilter = 'ali';
    tick(1000);
    let args = salesOrderService.getSalesOrderItemReport.calls.mostRecent().args[0];
    expect(args.customerName).toBe('ali');
    expect(args.skip).toBe(0);
    expect(component.paginator.pageIndex).toBe(0);

    component.OrderNumberFilter = 'SO-9';
    tick(1000);
    args = salesOrderService.getSalesOrderItemReport.calls.mostRecent().args[0];
    expect(args.orderNumber).toBe('SO-9');
  }));

  it('onSearch copies form filters and skips reload when date range is invalid', fakeAsync(() => {
    create();
    salesOrderService.getSalesOrderItemReport.calls.reset();
    component.searchForm.patchValue({
      fromDate: new Date(2026, 0, 1),
      toDate: new Date(2026, 0, 31),
      productId: 'p1',
      locationId: 'loc2',
    });
    component.onSearch();
    let args = salesOrderService.getSalesOrderItemReport.calls.mostRecent().args[0];
    expect(args.productId).toBe('p1');
    expect(args.locationId).toBe('loc2');

    salesOrderService.getSalesOrderItemReport.calls.reset();
    component.searchForm.patchValue({ fromDate: new Date(2026, 1, 1), toDate: new Date(2026, 0, 1) });
    expect(component.searchForm.valid).toBeFalse();
    component.onSearch();
    expect(salesOrderService.getSalesOrderItemReport).not.toHaveBeenCalled();
  }));

  it('onClear resets the form and reloads with the first location', fakeAsync(() => {
    create();
    component.searchForm.patchValue({ productId: 'p1' });
    component.onSearch();
    component.onClear();
    expect(component.searchForm.get('productId')?.value).toBeNull();
    const args = salesOrderService.getSalesOrderItemReport.calls.mostRecent().args[0];
    expect(args.locationId).toBe('loc1');
    expect(args.productId).toBeNull();
  }));

  it('sort and page handlers recompute orderBy and skip', fakeAsync(() => {
    create();
    salesOrderService.getSalesOrderItemReport.and.returnValue(of(plain(items)));
    salesOrderService.getSalesOrderItemReport.calls.reset();
    component.sort.active = 'productName';
    component.sort.direction = 'desc';
    component.sort.sortChange.emit({ active: 'productName', direction: 'desc' } as Sort);
    let args = salesOrderService.getSalesOrderItemReport.calls.mostRecent().args[0];
    expect(args.orderBy).toBe('productName desc');
    expect(args.skip).toBe(0);

    component.paginator.pageIndex = 2;
    component.paginator.pageSize = 10;
    component.paginator.page.emit({ pageIndex: 2, pageSize: 10, length: 30 } as PageEvent);
    args = salesOrderService.getSalesOrderItemReport.calls.mostRecent().args[0];
    expect(args.skip).toBe(20);
    expect(args.pageSize).toBe(10);
  }));

  it('product search control debounces into getProductsDropdown with the typed name', fakeAsync(() => {
    create();
    productService.getProductsDropdown.calls.reset();
    component.searchForm.get('filterProductValue')?.setValue('asp');
    tick(500);
    expect(productService.getProductsDropdown).toHaveBeenCalled();
    const args = productService.getProductsDropdown.calls.mostRecent().args[0];
    expect(args.name).toBe('asp');
  }));

  it('onDownloadReport reports no data when the loaded report is empty', fakeAsync(() => {
    create();
    component.salesOrderResource.totalCount = 0;
    salesOrderService.getSalesOrderItemReport.calls.reset();
    component.onDownloadReport('pdf');
    expect(toastrService.error).toHaveBeenCalledWith('TRANSLATED');
    expect(salesOrderService.getSalesOrderItemReport).not.toHaveBeenCalled();
  }));

  it('onDownloadReport email path fetches all rows and opens the send-email dialog', fakeAsync(() => {
    create();
    let downloadArgs: any = null;
    salesOrderService.getSalesOrderItemReport.and.callFake((resource: any) => {
      downloadArgs = { ...resource };
      return of(paginated(items));
    });
    dialog.open.and.returnValue({ afterClosed: () => of(void 0) } as any);
    component.onDownloadReport('email');
    expect(downloadArgs.pageSize).toBe(0);
    expect(component.salesOrderItems.length).toBe(2);
    expect(dialog.open).toHaveBeenCalledWith(
      jasmine.anything(),
      jasmine.objectContaining({
        data: jasmine.objectContaining({ name: 'TRANSLATED.pdf', contentType: 'application/pdf' }),
      })
    );
  }));
});
