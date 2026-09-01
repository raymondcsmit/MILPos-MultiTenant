import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpHeaders, HttpResponse, provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { BehaviorSubject, of } from 'rxjs';

import { InputTaxReportComponent } from './input-tax-report.component';
import { PurchaseOrderService } from '../../../purchase-order/purchase-order.service';
import { SupplierService } from '../../../supplier/supplier.service';
import { CommonService } from '@core/services/common.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';

describe('InputTaxReportComponent', () => {
  let component: InputTaxReportComponent;
  let fixture: ComponentFixture<InputTaxReportComponent>;
  let purchaseOrderService: jasmine.SpyObj<PurchaseOrderService>;
  let supplierService: jasmine.SpyObj<SupplierService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  const purchaseOrders: PurchaseOrder[] = [
    { id: 'po-1', poCreatedDate: '2026-01-01T00:00:00Z', orderNumber: 'PO-1', supplierName: 'Acme', supplierTaxNumber: 'TAX1', businessLocation: 'Main', totalAmount: 1000, totalTax: 170 } as unknown as PurchaseOrder,
    { id: 'po-2', poCreatedDate: '2026-01-02T00:00:00Z', orderNumber: 'PO-2', supplierName: 'Boll', supplierTaxNumber: 'TAX2', businessLocation: 'Main', totalAmount: 500, totalTax: 85 } as unknown as PurchaseOrder,
  ];

  function paginated<T>(body: T[], header: Record<string, number> = {}): HttpResponse<T[]> {
    return new HttpResponse({
      body,
      headers: new HttpHeaders({
        'X-Pagination': JSON.stringify({ totalCount: body.length, pageSize: 50, skip: 0, ...header }),
      }),
    });
  }

  beforeEach(() => {
    purchaseOrderService = jasmine.createSpyObj<PurchaseOrderService>('PurchaseOrderService', ['getAllPurchaseOrder', 'getPurchaseOrderTotal', 'getTotalByTaxForPurchaseOrder', 'getPurchaseOrderTaxItems']);
    supplierService = jasmine.createSpyObj<SupplierService>('SupplierService', ['getSuppliersForDropDown']);
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getLocationsForReport']);
    commonService.getLocationsForReport.and.returnValue(of({ locations: [{ id: 'loc1', name: 'Main' } as any], selectedLocation: 'loc1' } as any));
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);

    TestBed.configureTestingModule({
      imports: [InputTaxReportComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideNativeDateAdapter(),
        CurrencyPipe,
        { provide: JwtHelperService, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: PurchaseOrderService, useValue: purchaseOrderService },
        { provide: SupplierService, useValue: supplierService },
        { provide: CommonService, useValue: commonService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialog, useValue: dialog },
      ],
    });
  });

  function create(): void {
    purchaseOrderService.getAllPurchaseOrder.and.returnValue(of(paginated(purchaseOrders)));
    purchaseOrderService.getPurchaseOrderTotal.and.returnValue(of({ grandTotalAmount: 1500, grandTotalTaxAmount: 255, grandTotalQuantity: 0, grandTotalDiscountAmount: 0, grandTotalPaidAmount: 0 }));
    purchaseOrderService.getTotalByTaxForPurchaseOrder.and.returnValue(of([{ taxId: 't1', name: 'GST 17%', totalAmount: 255 }] as any[]));
    purchaseOrderService.getPurchaseOrderTaxItems.and.returnValue(of([]));
    fixture = TestBed.createComponent(InputTaxReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }

  it('should create, default pageSize 50 with date range, load rows and totals for selected location', fakeAsync(() => {
    create();
    expect(component).toBeTruthy();
    expect(component.purchaseOrderResource.pageSize).toBe(50);
    expect(component.purchaseOrderResource.orderBy).toBe('poCreatedDate desc');
    expect(component.purchaseOrderResource.locationId).toBe('loc1');
    expect(purchaseOrderService.getAllPurchaseOrder).toHaveBeenCalledWith(jasmine.objectContaining({ locationId: 'loc1', pageSize: 50 }));
    expect(component.purchaseOrders.length).toBe(2);
    expect(purchaseOrderService.getPurchaseOrderTotal).toHaveBeenCalledWith(jasmine.objectContaining({ locationId: 'loc1' }));
    expect(purchaseOrderService.getTotalByTaxForPurchaseOrder).toHaveBeenCalled();
    expect(component.purchaseOrderTotal.grandTotalTaxAmount).toBe(255);
    expect(component.totalsByTax.length).toBe(1);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('PO-1');
    expect(text).toContain('Acme');
  }));

  it('onSearch copies form filters into resource and reloads rows plus totals', fakeAsync(() => {
    create();
    purchaseOrderService.getAllPurchaseOrder.calls.reset();
    component.searchForm.patchValue({ locationId: 'loc2', fromDate: new Date(2026, 0, 1), toDate: new Date(2026, 0, 31) });
    component.onSearch();
    const args = purchaseOrderService.getAllPurchaseOrder.calls.mostRecent().args[0];
    expect(args.locationId).toBe('loc2');
    expect(args.fromDate).toEqual(new Date(2026, 0, 1));
    expect(args.toDate).toEqual(new Date(2026, 0, 31));
    expect(purchaseOrderService.getTotalByTaxForPurchaseOrder).toHaveBeenCalled();
  }));

  it('order number filter setter debounces reload with skip reset', fakeAsync(() => {
    create();
    purchaseOrderService.getAllPurchaseOrder.calls.reset();
    component.OrderNumberFilter = 'PO-9';
    tick(1100);
    expect(component.paginator.pageIndex).toBe(0);
    expect(purchaseOrderService.getAllPurchaseOrder).toHaveBeenCalledWith(jasmine.objectContaining({ orderNumber: 'PO-9', skip: 0 }));
  }));

  it('supplier filter setter routes supplierName into resource', fakeAsync(() => {
    create();
    purchaseOrderService.getAllPurchaseOrder.calls.reset();
    component.SupplierFilter = 'Acme';
    tick(1100);
    expect(purchaseOrderService.getAllPurchaseOrder).toHaveBeenCalledWith(jasmine.objectContaining({ supplierName: 'Acme' }));
  }));

  it('paginator page computes skip from pageIndex and pageSize', fakeAsync(() => {
    // capture at call time: the response header sync overwrites the shared
    // resource object after the load
    let captured: any = null;
    create();
    purchaseOrderService.getAllPurchaseOrder.and.callFake((r: any) => {
      captured = { skip: r.skip, pageSize: r.pageSize, orderBy: r.orderBy };
      return of(paginated(purchaseOrders));
    });
    component.paginator.pageIndex = 1;
    component.paginator.pageSize = 10;
    component.paginator.page.emit({ pageIndex: 1, pageSize: 10, length: 25 } as PageEvent);
    expect(captured.skip).toBe(10);
    expect(captured.pageSize).toBe(10);
    // page events rebuild orderBy from the untouched MatSort (direction '') —
    // pinning the actual trailing-space behavior
    expect(captured.orderBy).toBe('poCreatedDate ');
  }));

  it('toggleRow expands and collapses row', fakeAsync(() => {
    create();
    component.toggleRow(purchaseOrders[0]);
    expect(component.expandedElement).toBe(purchaseOrders[0]);
    component.toggleRow(purchaseOrders[0]);
    expect(component.expandedElement).toBeNull();
  }));

  it('onDownloadReport reports error when totalCount is zero', fakeAsync(() => {
    create();
    component.purchaseOrderResource.totalCount = 0;
    component.onDownloadReport('pdf');
    expect(toastrService.error).toHaveBeenCalledWith('TRANSLATED');
    expect(purchaseOrderService.getAllPurchaseOrder).toHaveBeenCalledTimes(1);
  }));

  it('onDownloadReport email path requests all rows and opens send-email dialog', fakeAsync(() => {
    create();
    dialog.open.and.returnValue({ afterClosed: () => of(void 0) } as any);
    // capture at call time: the resource is restored to pageSize 50 after the fetch
    let fetched: any = null;
    purchaseOrderService.getAllPurchaseOrder.and.callFake((r: any) => {
      fetched = { pageSize: r.pageSize, skip: r.skip };
      return of(paginated(purchaseOrders));
    });
    component.onDownloadReport('email');
    expect(fetched).toEqual({ pageSize: 0, skip: 0 });
    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({
      data: jasmine.objectContaining({ name: 'TRANSLATED.pdf', contentType: 'application/pdf' }),
    }));
    expect(component.purchaseOrderResource.pageSize).toBe(50);
  }));
});
