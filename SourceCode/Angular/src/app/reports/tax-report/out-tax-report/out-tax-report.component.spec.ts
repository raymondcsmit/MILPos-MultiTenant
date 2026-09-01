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

import { OutTaxReportComponent } from './out-tax-report.component';
import { SalesOrderService } from '../../../sales-order/sales-order.service';
import { CustomerService } from '../../../customer/customer.service';
import { CommonService } from '@core/services/common.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { SalesOrder } from '@core/domain-classes/sales-order';

describe('OutTaxReportComponent', () => {
  let component: OutTaxReportComponent;
  let fixture: ComponentFixture<OutTaxReportComponent>;
  let salesOrderService: jasmine.SpyObj<SalesOrderService>;
  let customerService: jasmine.SpyObj<CustomerService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  const salesOrders: SalesOrder[] = [
    { id: 'so-1', soCreatedDate: '2026-01-01T00:00:00Z', orderNumber: 'SO-1', customerName: 'Coke', customerTaxNumber: 'CTAX1', totalAmount: 500, totalTax: 25 } as unknown as SalesOrder,
    { id: 'so-2', soCreatedDate: '2026-01-02T00:00:00Z', orderNumber: 'SO-2', customerName: 'Pepsi', customerTaxNumber: 'CTAX2', totalAmount: 300, totalTax: 15 } as unknown as SalesOrder,
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
    salesOrderService = jasmine.createSpyObj<SalesOrderService>('SalesOrderService', ['getAllSalesOrder', 'getAllSalesOrderExcel', 'getSalesOrderTotal', 'getTotalByTaxForSalesOrder', 'getSalesOrderTaxItems']);
    customerService = jasmine.createSpyObj<CustomerService>('CustomerService', ['getCustomersForDropDown']);
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getLocationsForReport']);
    commonService.getLocationsForReport.and.returnValue(of({ locations: [{ id: 'loc1', name: 'Main' } as any], selectedLocation: 'loc1' } as any));
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);

    TestBed.configureTestingModule({
      imports: [OutTaxReportComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideNativeDateAdapter(),
        CurrencyPipe,
        { provide: JwtHelperService, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: SalesOrderService, useValue: salesOrderService },
        { provide: CustomerService, useValue: customerService },
        { provide: CommonService, useValue: commonService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialog, useValue: dialog },
      ],
    });
  });

  function create(): void {
    salesOrderService.getAllSalesOrder.and.returnValue(of(paginated(salesOrders)));
    salesOrderService.getAllSalesOrderExcel.and.returnValue(of(paginated(salesOrders)));
    salesOrderService.getSalesOrderTotal.and.returnValue(of({ grandTotalAmount: 800, grandTotalTaxAmount: 40, grandTotalQuantity: 0, grandTotalDiscountAmount: 0, grandTotalPaidAmount: 0 }));
    salesOrderService.getTotalByTaxForSalesOrder.and.returnValue(of([{ taxId: 't1', name: 'GST 5%', totalAmount: 40 }] as any[]));
    salesOrderService.getSalesOrderTaxItems.and.returnValue(of([]));
    fixture = TestBed.createComponent(OutTaxReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }

  it('should create, default pageSize 50 with date range, load rows and totals for selected location', fakeAsync(() => {
    create();
    expect(component).toBeTruthy();
    expect(component.salesOrderResource.pageSize).toBe(50);
    expect(component.salesOrderResource.orderBy).toBe('soCreatedDate desc');
    expect(component.salesOrderResource.locationId).toBe('loc1');
    expect(salesOrderService.getAllSalesOrder).toHaveBeenCalledWith(jasmine.objectContaining({ locationId: 'loc1', pageSize: 50 }));
    expect(component.salesOrderItems.length).toBe(2);
    expect(salesOrderService.getSalesOrderTotal).toHaveBeenCalled();
    expect(component.salesOrderTotal.grandTotalTaxAmount).toBe(40);
    expect(component.totalsByTax.length).toBe(1);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('SO-1');
    expect(text).toContain('Coke');
  }));

  it('onSearch copies form filters into resource and reloads rows plus totals', fakeAsync(() => {
    create();
    salesOrderService.getAllSalesOrder.calls.reset();
    component.searchForm.patchValue({ locationId: 'loc2', fromDate: new Date(2026, 0, 1), toDate: new Date(2026, 0, 31) });
    component.onSearch();
    const args = salesOrderService.getAllSalesOrder.calls.mostRecent().args[0];
    expect(args.locationId).toBe('loc2');
    expect(args.fromDate).toEqual(new Date(2026, 0, 1));
    expect(args.toDate).toEqual(new Date(2026, 0, 31));
    expect(salesOrderService.getTotalByTaxForSalesOrder).toHaveBeenCalled();
  }));

  it('order number filter setter debounces reload with skip reset', fakeAsync(() => {
    create();
    salesOrderService.getAllSalesOrder.calls.reset();
    component.OrderNumberFilter = 'SO-9';
    tick(1100);
    expect(component.paginator.pageIndex).toBe(0);
    expect(salesOrderService.getAllSalesOrder).toHaveBeenCalledWith(jasmine.objectContaining({ orderNumber: 'SO-9', skip: 0 }));
  }));

  it('customer filter setter routes customerName into resource', fakeAsync(() => {
    create();
    salesOrderService.getAllSalesOrder.calls.reset();
    component.CustomerFilter = 'Coke';
    tick(1100);
    expect(salesOrderService.getAllSalesOrder).toHaveBeenCalledWith(jasmine.objectContaining({ customerName: 'Coke' }));
  }));

  it('paginator page computes skip from pageIndex and pageSize', fakeAsync(() => {
    // capture at call time: the response header sync overwrites the shared
    // resource object after the load, so mostRecent().args would read the
    // post-mutation values
    let captured: any = null;
    create();
    salesOrderService.getAllSalesOrder.and.callFake((r: any) => {
      captured = { skip: r.skip, pageSize: r.pageSize };
      return of(paginated(salesOrders));
    });
    component.paginator.pageIndex = 2;
    component.paginator.pageSize = 20;
    component.paginator.page.emit({ pageIndex: 2, pageSize: 20, length: 90 } as PageEvent);
    expect(captured.pageSize).toBe(20);
    expect(captured.skip).toBe(40);
  }));

  it('toggleRow expands and collapses row', fakeAsync(() => {
    create();
    component.toggleRow(salesOrders[1]);
    expect(component.expandedElement).toBe(salesOrders[1]);
    component.toggleRow(salesOrders[1]);
    expect(component.expandedElement).toBeNull();
  }));

  it('onDownloadReport reports error when totalCount is zero', fakeAsync(() => {
    create();
    component.salesOrderResource.totalCount = 0;
    component.onDownloadReport('pdf');
    expect(toastrService.error).toHaveBeenCalledWith('TRANSLATED');
    expect(salesOrderService.getAllSalesOrderExcel).not.toHaveBeenCalled();
  }));

  it('onDownloadReport email path uses excel endpoint and opens send-email dialog', fakeAsync(() => {
    create();
    dialog.open.and.returnValue({ afterClosed: () => of(void 0) } as any);
    component.onDownloadReport('email');
    expect(salesOrderService.getAllSalesOrderExcel).toHaveBeenCalledWith(jasmine.objectContaining({ totalCount: 2 }));
    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({
      data: jasmine.objectContaining({ name: 'TRANSLATED.pdf', contentType: 'application/pdf' }),
    }));
  }));
});
