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

import { PurchaseOrderReportComponent } from './purchase-order-report.component';
import { PurchaseOrderService } from '../../purchase-order/purchase-order.service';
import { SupplierService } from '../../supplier/supplier.service';
import { ProductService } from '../../product/product.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';
import { PurchaseOrderItem } from '@core/domain-classes/purchase-order-item';

describe('PurchaseOrderReportComponent', () => {
  let component: PurchaseOrderReportComponent;
  let fixture: ComponentFixture<PurchaseOrderReportComponent>;
  let purchaseOrderService: jasmine.SpyObj<PurchaseOrderService>;
  let supplierService: jasmine.SpyObj<SupplierService>;
  let productService: jasmine.SpyObj<ProductService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;

  const orders: PurchaseOrder[] = [
    {
      id: 'po1',
      orderNumber: 'PO-1',
      supplierName: 'MedCorp',
      poCreatedDate: new Date('2026-02-05T00:00:00Z'),
      deliveryDate: new Date('2026-02-08T00:00:00Z'),
      totalDiscount: 2,
      totalTax: 3,
      totalAmount: 120,
      totalPaidAmount: 100,
      paymentStatus: 1,
      status: 0,
    } as unknown as PurchaseOrder,
    {
      id: 'po2',
      orderNumber: 'PO-2',
      supplierName: 'MedSupply',
      poCreatedDate: new Date('2026-02-06T00:00:00Z'),
      deliveryDate: new Date('2026-02-09T00:00:00Z'),
      totalDiscount: 0,
      totalTax: 1,
      totalAmount: 60,
      totalPaidAmount: 60,
      paymentStatus: 2,
      status: 1,
    } as unknown as PurchaseOrder,
  ];

  function paginated(body: PurchaseOrder[]): HttpResponse<PurchaseOrder[]> {
    return new HttpResponse({
      body,
      headers: new HttpHeaders({
        'X-Pagination': JSON.stringify({ totalCount: body.length, pageSize: 50, skip: 0 }),
      }),
    });
  }

  beforeEach(() => {
    purchaseOrderService = jasmine.createSpyObj<PurchaseOrderService>('PurchaseOrderService', [
      'getAllPurchaseOrder',
      'getPurchaseOrderItems',
      'getPurchaseOrderById',
    ]);
    supplierService = jasmine.createSpyObj<SupplierService>('SupplierService', ['getSuppliersForDropDown']);
    productService = jasmine.createSpyObj<ProductService>('ProductService', ['getProductsDropdown']);
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getLocationsForReport']);
    commonService.getLocationsForReport.and.returnValue(of({ locations: [{ id: 'loc1', name: 'Main' } as any], selectedLocation: 'loc1' } as any));
    productService.getProductsDropdown.and.returnValue(of([]));
    purchaseOrderService.getPurchaseOrderItems.and.returnValue(of([]));
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    const securityService = jasmine.createSpyObj('SecurityService', ['hasClaim']);
    (securityService as any).currencyCode = 'USD';
    securityService.hasClaim.and.returnValue(true);

    TestBed.configureTestingModule({
      imports: [PurchaseOrderReportComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideNativeDateAdapter(),
        CurrencyPipe,
        { provide: PurchaseOrderService, useValue: purchaseOrderService },
        { provide: SupplierService, useValue: supplierService },
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
    purchaseOrderService.getAllPurchaseOrder.and.returnValue(of(paginated(orders)));
    fixture = TestBed.createComponent(PurchaseOrderReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and load orders for the selected location on init', fakeAsync(() => {
    create();
    expect(component).toBeTruthy();
    expect(purchaseOrderService.getAllPurchaseOrder).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({ locationId: 'loc1', pageSize: 50, skip: 0, orderBy: 'poCreatedDate asc', isPurchaseOrderRequest: false })
    );
    expect(component.purchaseOrders.length).toBe(2);
    expect(component.searchForm.get('locationId')?.value).toBe('loc1');
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('PO-1');
    expect(text).toContain('MedCorp');
  }));

  it('supplier and order number filters debounce into the resource and reset skip', fakeAsync(() => {
    create();
    purchaseOrderService.getAllPurchaseOrder.calls.reset();
    component.SupplierFilter = 'MedCorp';
    tick(1000);
    let args = purchaseOrderService.getAllPurchaseOrder.calls.mostRecent().args[0];
    expect(args.supplierName).toBe('MedCorp');
    expect(args.skip).toBe(0);
    expect(component.paginator.pageIndex).toBe(0);

    component.OrderNumberFilter = 'PO-9';
    tick(1000);
    args = purchaseOrderService.getAllPurchaseOrder.calls.mostRecent().args[0];
    expect(args.orderNumber).toBe('PO-9');
  }));

  it('onSearch copies form filters and skips reload when date range is invalid', fakeAsync(() => {
    create();
    purchaseOrderService.getAllPurchaseOrder.calls.reset();
    component.searchForm.patchValue({
      fromDate: new Date(2026, 1, 1),
      toDate: new Date(2026, 1, 28),
      productId: 'p1',
      locationId: 'loc2',
    });
    component.onSearch();
    const args = purchaseOrderService.getAllPurchaseOrder.calls.mostRecent().args[0];
    expect(args.productId).toBe('p1');
    expect(args.locationId).toBe('loc2');

    purchaseOrderService.getAllPurchaseOrder.calls.reset();
    component.searchForm.patchValue({ fromDate: new Date(2026, 2, 1), toDate: new Date(2026, 1, 1) });
    expect(component.searchForm.valid).toBeFalse();
    component.onSearch();
    expect(purchaseOrderService.getAllPurchaseOrder).not.toHaveBeenCalled();
  }));

  it('onClear resets the form and reloads with the first location', fakeAsync(() => {
    create();
    component.searchForm.patchValue({ productId: 'p1' });
    component.onSearch();
    component.onClear();
    expect(component.searchForm.get('productId')?.value).toBeNull();
    const args = purchaseOrderService.getAllPurchaseOrder.calls.mostRecent().args[0];
    expect(args.locationId).toBe('loc1');
    expect(args.productId).toBeNull();
  }));

  it('sort and page handlers recompute orderBy and skip', fakeAsync(() => {
    create();
    purchaseOrderService.getAllPurchaseOrder.and.returnValue(of(new HttpResponse({ body: orders })));
    purchaseOrderService.getAllPurchaseOrder.calls.reset();
    component.sort.active = 'orderNumber';
    component.sort.direction = 'desc';
    component.sort.sortChange.emit({ active: 'orderNumber', direction: 'desc' } as Sort);
    let args = purchaseOrderService.getAllPurchaseOrder.calls.mostRecent().args[0];
    expect(args.orderBy).toBe('orderNumber desc');
    expect(args.skip).toBe(0);

    component.paginator.pageIndex = 2;
    component.paginator.pageSize = 10;
    component.paginator.page.emit({ pageIndex: 2, pageSize: 10, length: 30 } as PageEvent);
    args = purchaseOrderService.getAllPurchaseOrder.calls.mostRecent().args[0];
    expect(args.skip).toBe(20);
    expect(args.pageSize).toBe(10);
  }));

  it('toggleRow expands the order and renders the items child which loads its items', fakeAsync(() => {
    purchaseOrderService.getPurchaseOrderItems.and.returnValue(
      of([{ id: 'i1', productId: 'p1', productName: 'Paracetamol', unitPrice: 8, quantity: 4, discount: 0, taxValue: 1, purchaseOrderItemTaxes: [] } as unknown as PurchaseOrderItem])
    );
    create();
    expect(purchaseOrderService.getPurchaseOrderItems).not.toHaveBeenCalled();
    component.toggleRow(component.purchaseOrders[0]);
    expect(component.expandedElement).toBe(component.purchaseOrders[0]);
    fixture.detectChanges();
    expect(purchaseOrderService.getPurchaseOrderItems).toHaveBeenCalledWith('po1');
    const child = fixture.nativeElement.querySelector('app-purchase-order-report-item');
    expect(child).toBeTruthy();
    expect(child.textContent).toContain('Paracetamol');

    component.toggleRow(component.purchaseOrders[0]);
    expect(component.expandedElement).toBeNull();
  }));

  it('generateInvoice fetches the order by id and binds it for the invoice child', fakeAsync(() => {
    create();
    purchaseOrderService.getPurchaseOrderById.and.returnValue(of(orders[0]));
    component.generateInvoice(component.purchaseOrders[0]);
    expect(purchaseOrderService.getPurchaseOrderById).toHaveBeenCalledWith('po1');
    expect(component.purchaseOrderForInvoice).toBe(orders[0]);
  }));

  it('onDownloadReport reports no data when the loaded report is empty', fakeAsync(() => {
    create();
    component.purchaseOrderResource.totalCount = 0;
    purchaseOrderService.getAllPurchaseOrder.calls.reset();
    component.onDownloadReport('pdf');
    expect(toastrService.error).toHaveBeenCalledWith('TRANSLATED');
    expect(purchaseOrderService.getAllPurchaseOrder).not.toHaveBeenCalled();
  }));

  it('onDownloadReport email path resets paging, fetches all orders and opens the send-email dialog', fakeAsync(() => {
    create();
    let downloadArgs: any = null;
    purchaseOrderService.getAllPurchaseOrder.and.callFake((resource: any) => {
      downloadArgs = { ...resource };
      return of(paginated(orders));
    });
    dialog.open.and.returnValue({ afterClosed: () => of(void 0) } as any);
    component.onDownloadReport('email');
    expect(downloadArgs.pageSize).toBe(0);
    expect(downloadArgs.skip).toBe(0);
    expect(dialog.open).toHaveBeenCalledWith(
      jasmine.anything(),
      jasmine.objectContaining({
        data: jasmine.objectContaining({ name: 'TRANSLATED.pdf', contentType: 'application/pdf' }),
      })
    );
  }));
});
