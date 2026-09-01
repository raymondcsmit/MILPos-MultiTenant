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

import { SalesPaymentReportComponent } from './sales-payment-report.component';
import { SalesPaymentReportService } from './sales-payment-report.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { SalesOrderPayment } from '@core/domain-classes/sales-order-payment';

describe('SalesPaymentReportComponent', () => {
  let component: SalesPaymentReportComponent;
  let fixture: ComponentFixture<SalesPaymentReportComponent>;
  let salesPaymentReportService: jasmine.SpyObj<SalesPaymentReportService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;

  const payments: SalesOrderPayment[] = [
    { id: 'sp1', paymentDate: new Date('2026-01-05T00:00:00Z'), orderNumber: 'SO-1', referenceNumber: 'REF-1', amount: 50, paymentMethod: 1 } as unknown as SalesOrderPayment,
    { id: 'sp2', paymentDate: new Date('2026-01-06T00:00:00Z'), orderNumber: 'SO-2', referenceNumber: 'REF-2', amount: 75, paymentMethod: 2 } as unknown as SalesOrderPayment,
  ];

  function paginated(body: SalesOrderPayment[]): HttpResponse<SalesOrderPayment[]> {
    return new HttpResponse({
      body,
      headers: new HttpHeaders({
        'X-Pagination': JSON.stringify({ totalCount: body.length, pageSize: 50, skip: 0 }),
      }),
    });
  }

  beforeEach(() => {
    salesPaymentReportService = jasmine.createSpyObj<SalesPaymentReportService>('SalesPaymentReportService', [
      'getAllSalesOrderPaymentReport',
      'getAllSalesOrderPaymentReportExcel',
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
      imports: [SalesPaymentReportComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideNativeDateAdapter(),
        CurrencyPipe,
        { provide: SalesPaymentReportService, useValue: salesPaymentReportService },
        { provide: CommonService, useValue: commonService },
        { provide: SecurityService, useValue: securityService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialog, useValue: dialog },
      ],
    });
  });

  function create(): void {
    salesPaymentReportService.getAllSalesOrderPaymentReport.and.returnValue(of(paginated(payments)));
    fixture = TestBed.createComponent(SalesPaymentReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and load payments for the selected location on init', fakeAsync(() => {
    create();
    expect(component).toBeTruthy();
    expect(salesPaymentReportService.getAllSalesOrderPaymentReport).toHaveBeenCalledWith(
      jasmine.objectContaining({ locationId: 'loc1', fromDate: component.FromDate, toDate: component.ToDate })
    );
    expect(component.salesOrderPayment.length).toBe(2);
    expect(component.searchForm.get('locationId')?.value).toBe('loc1');
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('SO-1');
    expect(text).toContain('REF-2');
  }));

  it('onSearch copies form filters and skips reload when date range is invalid', fakeAsync(() => {
    create();
    salesPaymentReportService.getAllSalesOrderPaymentReport.calls.reset();
    component.searchForm.patchValue({
      fromDate: new Date(2026, 0, 1),
      toDate: new Date(2026, 0, 31),
      locationId: 'loc2',
    });
    component.onSearch();
    let args = salesPaymentReportService.getAllSalesOrderPaymentReport.calls.mostRecent().args[0];
    expect(args.locationId).toBe('loc2');
    expect(args.fromDate).toEqual(new Date(2026, 0, 1));

    salesPaymentReportService.getAllSalesOrderPaymentReport.calls.reset();
    component.searchForm.patchValue({ fromDate: new Date(2026, 1, 1), toDate: new Date(2026, 0, 1) });
    expect(component.searchForm.valid).toBeFalse();
    component.onSearch();
    expect(salesPaymentReportService.getAllSalesOrderPaymentReport).not.toHaveBeenCalled();
  }));

  it('onClear resets the form and reloads with the first location', fakeAsync(() => {
    create();
    component.searchForm.patchValue({ locationId: 'loc2' });
    component.onSearch();
    component.onClear();
    const args = salesPaymentReportService.getAllSalesOrderPaymentReport.calls.mostRecent().args[0];
    expect(args.locationId).toBe('loc1');
  }));

  it('sort and page handlers recompute orderBy and skip', fakeAsync(() => {
    create();
    salesPaymentReportService.getAllSalesOrderPaymentReport.and.returnValue(of(new HttpResponse({ body: payments })));
    salesPaymentReportService.getAllSalesOrderPaymentReport.calls.reset();
    component.sort.active = 'paymentDate';
    component.sort.direction = 'desc';
    component.sort.sortChange.emit({ active: 'paymentDate', direction: 'desc' } as Sort);
    let args = salesPaymentReportService.getAllSalesOrderPaymentReport.calls.mostRecent().args[0];
    expect(args.orderBy).toBe('paymentDate desc');
    expect(args.skip).toBe(0);

    component.paginator.pageIndex = 1;
    component.paginator.pageSize = 25;
    component.paginator.page.emit({ pageIndex: 1, pageSize: 25, length: 40 } as PageEvent);
    args = salesPaymentReportService.getAllSalesOrderPaymentReport.calls.mostRecent().args[0];
    expect(args.skip).toBe(25);
    expect(args.pageSize).toBe(25);
  }));

  it('onDownloadReport reports no data when the loaded report is empty', fakeAsync(() => {
    create();
    component.salesOrderResource.totalCount = 0;
    salesPaymentReportService.getAllSalesOrderPaymentReport.calls.reset();
    component.onDownloadReport('pdf');
    expect(toastrService.error).toHaveBeenCalledWith('TRANSLATED');
    expect(salesPaymentReportService.getAllSalesOrderPaymentReportExcel).not.toHaveBeenCalled();
  }));

  it('onDownloadReport email path fetches all payments and opens the send-email dialog', fakeAsync(() => {
    create();
    salesPaymentReportService.getAllSalesOrderPaymentReportExcel.and.returnValue(of(paginated(payments)));
    dialog.open.and.returnValue({ afterClosed: () => of(void 0) } as any);
    component.onDownloadReport('email');
    expect(salesPaymentReportService.getAllSalesOrderPaymentReportExcel).toHaveBeenCalledWith(component.salesOrderResource);
    expect(dialog.open).toHaveBeenCalledWith(
      jasmine.anything(),
      jasmine.objectContaining({
        data: jasmine.objectContaining({ name: 'TRANSLATED.pdf', contentType: 'application/pdf' }),
      })
    );
  }));
});
