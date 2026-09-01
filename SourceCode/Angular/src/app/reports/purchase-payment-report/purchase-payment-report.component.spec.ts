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

import { PurchasePaymentReportComponent } from './purchase-payment-report.component';
import { PurchasePaymentReportService } from './purchase-payment-report.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { PurchaseOrderPayment } from '@core/domain-classes/purchase-order-payment';

describe('PurchasePaymentReportComponent', () => {
  let component: PurchasePaymentReportComponent;
  let fixture: ComponentFixture<PurchasePaymentReportComponent>;
  let purchasePaymentReportService: jasmine.SpyObj<PurchasePaymentReportService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;

  const payments: PurchaseOrderPayment[] = [
    { id: 'pp1', paymentDate: new Date('2026-02-05T00:00:00Z'), orderNumber: 'PO-1', referenceNumber: 'REF-1', amount: 80, paymentMethod: 1 } as unknown as PurchaseOrderPayment,
    { id: 'pp2', paymentDate: new Date('2026-02-06T00:00:00Z'), orderNumber: 'PO-2', referenceNumber: 'REF-2', amount: 120, paymentMethod: 2 } as unknown as PurchaseOrderPayment,
  ];

  function paginated(body: PurchaseOrderPayment[]): HttpResponse<PurchaseOrderPayment[]> {
    return new HttpResponse({
      body,
      headers: new HttpHeaders({
        'X-Pagination': JSON.stringify({ totalCount: body.length, pageSize: 50, skip: 0 }),
      }),
    });
  }

  beforeEach(() => {
    purchasePaymentReportService = jasmine.createSpyObj<PurchasePaymentReportService>('PurchasePaymentReportService', [
      'getAllPurchaseOrderPaymentReport',
      'getAllPurchaseOrderPaymentReportExcel',
    ]);
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getLocationsForReport']);
    commonService.getLocationsForReport.and.returnValue(of({ locations: [{ id: 'loc1', name: 'Main' } as any], selectedLocation: 'loc1' } as any));
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    const securityService = jasmine.createSpyObj('SecurityService', ['hasClaim']);
    (securityService as any).currencyCode = 'USD';
    securityService.hasClaim.and.returnValue(true);

    TestBed.configureTestingModule({
      imports: [PurchasePaymentReportComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideNativeDateAdapter(),
        CurrencyPipe,
        { provide: PurchasePaymentReportService, useValue: purchasePaymentReportService },
        { provide: CommonService, useValue: commonService },
        { provide: SecurityService, useValue: securityService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialog, useValue: dialog },
      ],
    });
  });

  function create(): void {
    purchasePaymentReportService.getAllPurchaseOrderPaymentReport.and.returnValue(of(paginated(payments)));
    fixture = TestBed.createComponent(PurchasePaymentReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and load payments for the selected location on init', fakeAsync(() => {
    create();
    expect(component).toBeTruthy();
    expect(purchasePaymentReportService.getAllPurchaseOrderPaymentReport).toHaveBeenCalledWith(
      jasmine.objectContaining({ locationId: 'loc1', fromDate: component.FromDate, toDate: component.ToDate })
    );
    expect(component.purchaseOrderPayments.length).toBe(2);
    expect(component.searchForm.get('locationId')?.value).toBe('loc1');
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('PO-1');
    expect(text).toContain('REF-2');
  }));

  it('onSearch copies form filters and skips reload when date range is invalid', fakeAsync(() => {
    create();
    purchasePaymentReportService.getAllPurchaseOrderPaymentReport.calls.reset();
    component.searchForm.patchValue({
      fromDate: new Date(2026, 1, 1),
      toDate: new Date(2026, 1, 28),
      locationId: 'loc2',
    });
    component.onSearch();
    const args = purchasePaymentReportService.getAllPurchaseOrderPaymentReport.calls.mostRecent().args[0];
    expect(args.locationId).toBe('loc2');
    expect(args.fromDate).toEqual(new Date(2026, 1, 1));

    purchasePaymentReportService.getAllPurchaseOrderPaymentReport.calls.reset();
    component.searchForm.patchValue({ fromDate: new Date(2026, 2, 1), toDate: new Date(2026, 1, 1) });
    expect(component.searchForm.valid).toBeFalse();
    component.onSearch();
    expect(purchasePaymentReportService.getAllPurchaseOrderPaymentReport).not.toHaveBeenCalled();
  }));

  it('onClear resets the form and reloads with the first location', fakeAsync(() => {
    create();
    component.searchForm.patchValue({ locationId: 'loc2' });
    component.onSearch();
    component.onClear();
    const args = purchasePaymentReportService.getAllPurchaseOrderPaymentReport.calls.mostRecent().args[0];
    expect(args.locationId).toBe('loc1');
  }));

  it('sort and page handlers recompute orderBy and skip', fakeAsync(() => {
    create();
    purchasePaymentReportService.getAllPurchaseOrderPaymentReport.and.returnValue(of(new HttpResponse({ body: payments })));
    purchasePaymentReportService.getAllPurchaseOrderPaymentReport.calls.reset();
    component.sort.active = 'paymentDate';
    component.sort.direction = 'desc';
    component.sort.sortChange.emit({ active: 'paymentDate', direction: 'desc' } as Sort);
    let args = purchasePaymentReportService.getAllPurchaseOrderPaymentReport.calls.mostRecent().args[0];
    expect(args.orderBy).toBe('paymentDate desc');
    expect(args.skip).toBe(0);

    component.paginator.pageIndex = 2;
    component.paginator.pageSize = 15;
    component.paginator.page.emit({ pageIndex: 2, pageSize: 15, length: 45 } as PageEvent);
    args = purchasePaymentReportService.getAllPurchaseOrderPaymentReport.calls.mostRecent().args[0];
    expect(args.skip).toBe(30);
    expect(args.pageSize).toBe(15);
  }));

  it('onDownloadReport reports no data when the loaded report is empty', fakeAsync(() => {
    create();
    component.purchaseOrderResource.totalCount = 0;
    purchasePaymentReportService.getAllPurchaseOrderPaymentReport.calls.reset();
    component.onDownloadReport('pdf');
    expect(toastrService.error).toHaveBeenCalledWith('TRANSLATED');
    expect(purchasePaymentReportService.getAllPurchaseOrderPaymentReportExcel).not.toHaveBeenCalled();
  }));

  it('onDownloadReport email path fetches all payments and opens the send-email dialog', fakeAsync(() => {
    create();
    purchasePaymentReportService.getAllPurchaseOrderPaymentReportExcel.and.returnValue(of(paginated(payments)));
    dialog.open.and.returnValue({ afterClosed: () => of(void 0) } as any);
    component.onDownloadReport('email');
    expect(purchasePaymentReportService.getAllPurchaseOrderPaymentReportExcel).toHaveBeenCalledWith(component.purchaseOrderResource);
    expect(dialog.open).toHaveBeenCalledWith(
      jasmine.anything(),
      jasmine.objectContaining({
        data: jasmine.objectContaining({ name: 'TRANSLATED.pdf', contentType: 'application/pdf' }),
      })
    );
  }));
});
