import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { BehaviorSubject, of } from 'rxjs';

import { SupplierPaymentsComponent } from './supplier-payments.component';
import { SupplierService } from '../../supplier/supplier.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { SupplierPayment } from '@core/domain-classes/supplier-payment';

describe('SupplierPaymentsComponent', () => {
  let component: SupplierPaymentsComponent;
  let fixture: ComponentFixture<SupplierPaymentsComponent>;
  let supplierService: jasmine.SpyObj<SupplierService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;

  const payments: SupplierPayment[] = [
    { id: 'sp1', supplierName: 'MedCorp', totalAmount: 300, totalPaidAmount: 200, totalPendingAmount: 100 },
    { id: 'sp2', supplierName: 'MedSupply', totalAmount: 80, totalPaidAmount: 120, totalPendingAmount: -40 },
  ];

  function paginated(body: SupplierPayment[]): HttpResponse<SupplierPayment[]> {
    return new HttpResponse({
      body,
      headers: new HttpHeaders({
        'X-Pagination': JSON.stringify({ totalCount: body.length, pageSize: 10, skip: 0 }),
      }),
    });
  }

  beforeEach(() => {
    supplierService = jasmine.createSpyObj<SupplierService>('SupplierService', ['getSupplierPayments']);
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
      imports: [SupplierPaymentsComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        CurrencyPipe,
        { provide: SupplierService, useValue: supplierService },
        { provide: CommonService, useValue: commonService },
        { provide: SecurityService, useValue: securityService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialog, useValue: dialog },
      ],
    });
  });

  function create(): void {
    supplierService.getSupplierPayments.and.returnValue(of(paginated(payments)));
    fixture = TestBed.createComponent(SupplierPaymentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and load payments for the selected location after the location filter debounce', fakeAsync(() => {
    create();
    expect(component).toBeTruthy();
    expect(supplierService.getSupplierPayments).not.toHaveBeenCalled();
    tick(1100);
    fixture.detectChanges();
    expect(supplierService.getSupplierPayments).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({ locationId: 'loc1', pageSize: 10, skip: 0, orderBy: 'supplierName asc' })
    );
    expect(component.supplierPayments.length).toBe(2);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('MedCorp');
  }));

  it('name and location filters debounce into the resource with reset skip', fakeAsync(() => {
    create();
    tick(1100);
    supplierService.getSupplierPayments.calls.reset();
    component.NameFilter = 'med';
    tick(1000);
    let args = supplierService.getSupplierPayments.calls.mostRecent().args[0];
    expect(args.supplierName).toBe(escape('med'));
    expect(args.skip).toBe(0);
    expect(component.paginator.pageIndex).toBe(0);

    component.LocationFilter = 'loc2';
    tick(1000);
    args = supplierService.getSupplierPayments.calls.mostRecent().args[0];
    expect(args.locationId).toBe('loc2');
  }));

  it('sort and page handlers recompute orderBy and skip', fakeAsync(() => {
    create();
    tick(1100);
    supplierService.getSupplierPayments.and.returnValue(of(new HttpResponse({ body: payments })));
    supplierService.getSupplierPayments.calls.reset();
    component.sort.active = 'supplierName';
    component.sort.direction = 'desc';
    component.sort.sortChange.emit({ active: 'supplierName', direction: 'desc' } as Sort);
    let args = supplierService.getSupplierPayments.calls.mostRecent().args[0];
    expect(args.orderBy).toBe('supplierName desc');
    expect(args.skip).toBe(0);

    component.paginator.pageIndex = 3;
    component.paginator.pageSize = 10;
    component.paginator.page.emit({ pageIndex: 3, pageSize: 10, length: 35 } as PageEvent);
    args = supplierService.getSupplierPayments.calls.mostRecent().args[0];
    expect(args.skip).toBe(30);
    expect(args.pageSize).toBe(10);
  }));

  it('onDownloadReport reports no data when the loaded report is empty', fakeAsync(() => {
    create();
    tick(1100);
    component.supplierResource.totalCount = 0;
    supplierService.getSupplierPayments.calls.reset();
    component.onDownloadReport('pdf');
    expect(toastrService.error).toHaveBeenCalledWith('TRANSLATED');
    expect(supplierService.getSupplierPayments).not.toHaveBeenCalled();
  }));

  it('onDownloadReport email path fetches rows and opens the send-email dialog without resetting pageSize', fakeAsync(() => {
    create();
    tick(1100);
    let downloadArgs: any = null;
    supplierService.getSupplierPayments.and.callFake((resource: any) => {
      downloadArgs = { ...resource };
      return of(paginated(payments));
    });
    dialog.open.and.returnValue({ afterClosed: () => of(void 0) } as any);
    component.onDownloadReport('email');
    expect(downloadArgs.pageSize).toBe(10);
    expect(component.supplierResource.pageSize).toBe(10);
    expect(dialog.open).toHaveBeenCalledWith(
      jasmine.anything(),
      jasmine.objectContaining({
        data: jasmine.objectContaining({ name: 'TRANSLATED.pdf', contentType: 'application/pdf' }),
      })
    );
  }));
});
