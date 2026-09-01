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

import { ProductPurchaseReportComponent } from './product-purchase-report.component';
import { PurchaseOrderService } from '../../purchase-order/purchase-order.service';
import { SupplierService } from '../../supplier/supplier.service';
import { ProductService } from '../../product/product.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { PurchaseOrderItem } from '@core/domain-classes/purchase-order-item';

describe('ProductPurchaseReportComponent', () => {
  let component: ProductPurchaseReportComponent;
  let fixture: ComponentFixture<ProductPurchaseReportComponent>;
  let purchaseOrderService: jasmine.SpyObj<PurchaseOrderService>;
  let supplierService: jasmine.SpyObj<SupplierService>;
  let productService: jasmine.SpyObj<ProductService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;

  const items: PurchaseOrderItem[] = [
    {
      productId: 'p1',
      productName: 'Paracetamol',
      purchaseOrderNumber: 'PO-1',
      supplierName: 'MedCorp',
      poCreatedDate: new Date('2026-02-05T00:00:00Z'),
      unitName: 'Box',
      unitPrice: 8,
      quantity: 4,
      discount: 2,
      taxValue: 3,
      purchaseOrderItemTaxes: [{ taxName: 'GST', taxPercentage: 5 } as any],
    } as unknown as PurchaseOrderItem,
    {
      productId: 'p2',
      productName: 'Syringe',
      purchaseOrderNumber: 'PO-2',
      supplierName: 'MedSupply',
      poCreatedDate: new Date('2026-02-06T00:00:00Z'),
      unitName: 'Pack',
      unitPrice: 1,
      quantity: 50,
      discount: 0,
      taxValue: 0,
      purchaseOrderItemTaxes: [],
    } as unknown as PurchaseOrderItem,
  ];

  function paginated(body: PurchaseOrderItem[]): HttpResponse<PurchaseOrderItem[]> {
    return new HttpResponse({
      body,
      headers: new HttpHeaders({
        'X-Pagination': JSON.stringify({ totalCount: body.length, pageSize: 50, skip: 0 }),
      }),
    });
  }

  beforeEach(() => {
    purchaseOrderService = jasmine.createSpyObj<PurchaseOrderService>('PurchaseOrderService', ['getAllPurchaseOrderItemReport', 'getPurchaseOrderItemReport']);
    supplierService = jasmine.createSpyObj<SupplierService>('SupplierService', ['getSuppliersForDropDown']);
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
      imports: [ProductPurchaseReportComponent, TranslateModule.forRoot()],
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
    purchaseOrderService.getPurchaseOrderItemReport.and.returnValue(of(paginated(items)));
    fixture = TestBed.createComponent(ProductPurchaseReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and load items for the selected location on init', fakeAsync(() => {
    create();
    expect(component).toBeTruthy();
    expect(purchaseOrderService.getPurchaseOrderItemReport).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({ locationId: 'loc1', pageSize: 50, skip: 0, orderBy: 'poCreatedDate asc' })
    );
    expect(component.purchaseOrderItems.length).toBe(2);
    expect(component.searchForm.get('locationId')?.value).toBe('loc1');
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('Paracetamol');
    expect(text).toContain('PO-2');
  }));

  it('supplier and order number filters debounce into the resource and reset skip', fakeAsync(() => {
    create();
    purchaseOrderService.getPurchaseOrderItemReport.calls.reset();
    component.SupplierFilter = 'MedCorp';
    tick(1000);
    let args = purchaseOrderService.getPurchaseOrderItemReport.calls.mostRecent().args[0];
    expect(args.supplierName).toBe('MedCorp');
    expect(args.skip).toBe(0);
    expect(component.paginator.pageIndex).toBe(0);

    component.OrderNumberFilter = 'PO-9';
    tick(1000);
    args = purchaseOrderService.getPurchaseOrderItemReport.calls.mostRecent().args[0];
    expect(args.orderNumber).toBe('PO-9');
  }));

  it('onSearch copies form filters and skips reload when date range is invalid', fakeAsync(() => {
    create();
    purchaseOrderService.getPurchaseOrderItemReport.calls.reset();
    component.searchForm.patchValue({
      fromDate: new Date(2026, 1, 1),
      toDate: new Date(2026, 1, 28),
      productId: 'p2',
      locationId: 'loc2',
    });
    component.onSearch();
    const args = purchaseOrderService.getPurchaseOrderItemReport.calls.mostRecent().args[0];
    expect(args.productId).toBe('p2');
    expect(args.locationId).toBe('loc2');

    purchaseOrderService.getPurchaseOrderItemReport.calls.reset();
    component.searchForm.patchValue({ fromDate: new Date(2026, 2, 1), toDate: new Date(2026, 1, 1) });
    expect(component.searchForm.valid).toBeFalse();
    component.onSearch();
    expect(purchaseOrderService.getPurchaseOrderItemReport).not.toHaveBeenCalled();
  }));

  it('onClear resets the form and reloads with the first location', fakeAsync(() => {
    create();
    component.searchForm.patchValue({ productId: 'p2' });
    component.onSearch();
    component.onClear();
    expect(component.searchForm.get('productId')?.value).toBeNull();
    const args = purchaseOrderService.getPurchaseOrderItemReport.calls.mostRecent().args[0];
    expect(args.locationId).toBe('loc1');
    expect(args.productId).toBeNull();
  }));

  it('sort and page handlers recompute orderBy and skip', fakeAsync(() => {
    create();
    purchaseOrderService.getPurchaseOrderItemReport.and.returnValue(of(new HttpResponse({ body: items })));
    purchaseOrderService.getPurchaseOrderItemReport.calls.reset();
    component.sort.active = 'productName';
    component.sort.direction = 'desc';
    component.sort.sortChange.emit({ active: 'productName', direction: 'desc' } as Sort);
    let args = purchaseOrderService.getPurchaseOrderItemReport.calls.mostRecent().args[0];
    expect(args.orderBy).toBe('productName desc');
    expect(args.skip).toBe(0);

    component.paginator.pageIndex = 1;
    component.paginator.pageSize = 25;
    component.paginator.page.emit({ pageIndex: 1, pageSize: 25, length: 30 } as PageEvent);
    args = purchaseOrderService.getPurchaseOrderItemReport.calls.mostRecent().args[0];
    expect(args.skip).toBe(25);
    expect(args.pageSize).toBe(25);
  }));

  it('supplier control valueChanges stay unsubscribed because supplierList$ is not bound in the template', fakeAsync(() => {
    create();
    component.supplierNameControl.setValue('Med');
    tick(1000);
    expect(component.supplierList$).toBeDefined();
    expect(supplierService.getSuppliersForDropDown).not.toHaveBeenCalled();
  }));

  it('onDownloadReport reports no data when the loaded report is empty', fakeAsync(() => {
    create();
    component.purchaseOrderResource.totalCount = 0;
    component.onDownloadReport('pdf');
    expect(toastrService.error).toHaveBeenCalledWith('TRANSLATED');
  }));

  it('onDownloadReport email path fetches all rows and opens the send-email dialog', fakeAsync(() => {
    create();
    purchaseOrderService.getAllPurchaseOrderItemReport.and.returnValue(of(paginated(items)));
    dialog.open.and.returnValue({ afterClosed: () => of(void 0) } as any);
    component.onDownloadReport('email');
    const args = purchaseOrderService.getAllPurchaseOrderItemReport.calls.mostRecent().args[0];
    expect(args.pageSize).toBe(50);
    expect(dialog.open).toHaveBeenCalledWith(
      jasmine.anything(),
      jasmine.objectContaining({
        data: jasmine.objectContaining({ name: 'TRANSLATED.pdf', contentType: 'application/pdf' }),
      })
    );
  }));
});
