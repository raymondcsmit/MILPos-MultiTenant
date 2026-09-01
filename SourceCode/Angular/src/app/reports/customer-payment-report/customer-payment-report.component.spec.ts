import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { BehaviorSubject, of } from 'rxjs';

import { CustomerPaymentReportComponent } from './customer-payment-report.component';
import { CustomerService } from '../../customer/customer.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CustomerPayment } from '@core/domain-classes/customer-payment';

describe('CustomerPaymentReportComponent', () => {
  let component: CustomerPaymentReportComponent;
  let fixture: ComponentFixture<CustomerPaymentReportComponent>;
  let customerService: jasmine.SpyObj<CustomerService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;

  const payments: CustomerPayment[] = [
    { id: 'cp1', customerName: 'Coke', totalAmount: 100, totalPaidAmount: 50, totalPendingAmount: 50 },
    { id: 'cp2', customerName: 'Pepsi', totalAmount: 200, totalPaidAmount: 250, totalPendingAmount: -50 },
  ];

  function paginated(body: CustomerPayment[]): HttpResponse<CustomerPayment[]> {
    return new HttpResponse({
      body,
      headers: new HttpHeaders({
        'X-Pagination': JSON.stringify({ totalCount: body.length, pageSize: 10, skip: 0 }),
      }),
    });
  }

  beforeEach(() => {
    customerService = jasmine.createSpyObj<CustomerService>('CustomerService', ['getCustomerPayments']);
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
      imports: [CustomerPaymentReportComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        CurrencyPipe,
        { provide: CustomerService, useValue: customerService },
        { provide: CommonService, useValue: commonService },
        { provide: SecurityService, useValue: securityService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialog, useValue: dialog },
      ],
    });
  });

  function create(): void {
    customerService.getCustomerPayments.and.returnValue(of(paginated(payments)));
    fixture = TestBed.createComponent(CustomerPaymentReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and load payments for the selected location after the location filter debounce', fakeAsync(() => {
    create();
    expect(component).toBeTruthy();
    expect(customerService.getCustomerPayments).not.toHaveBeenCalled();
    tick(1100);
    fixture.detectChanges();
    expect(customerService.getCustomerPayments).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({ locationId: 'loc1', pageSize: 10, skip: 0, orderBy: 'customerName asc' })
    );
    expect(component.customerPayments.length).toBe(2);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('Coke');
  }));

  it('name and location filters debounce into the resource with reset skip', fakeAsync(() => {
    create();
    tick(1100);
    customerService.getCustomerPayments.calls.reset();
    component.NameFilter = 'coke';
    tick(1000);
    let args = customerService.getCustomerPayments.calls.mostRecent().args[0];
    expect(args.customerName).toBe(escape('coke'));
    expect(args.skip).toBe(0);
    expect(component.paginator.pageIndex).toBe(0);

    component.LocationFilter = 'loc2';
    tick(1000);
    args = customerService.getCustomerPayments.calls.mostRecent().args[0];
    expect(args.locationId).toBe('loc2');
  }));

  it('sort and page handlers recompute orderBy and skip', fakeAsync(() => {
    create();
    tick(1100);
    customerService.getCustomerPayments.and.returnValue(of(new HttpResponse({ body: payments })));
    customerService.getCustomerPayments.calls.reset();
    component.sort.active = 'totalAmount';
    component.sort.direction = 'desc';
    component.sort.sortChange.emit({ active: 'totalAmount', direction: 'desc' } as Sort);
    let args = customerService.getCustomerPayments.calls.mostRecent().args[0];
    expect(args.orderBy).toBe('totalAmount desc');
    expect(args.skip).toBe(0);

    component.paginator.pageIndex = 1;
    component.paginator.pageSize = 5;
    component.paginator.page.emit({ pageIndex: 1, pageSize: 5, length: 10 } as PageEvent);
    args = customerService.getCustomerPayments.calls.mostRecent().args[0];
    expect(args.skip).toBe(5);
    expect(args.pageSize).toBe(5);
  }));

  it('onDownloadReport reports no data when the loaded report is empty', fakeAsync(() => {
    create();
    tick(1100);
    component.customerResource.totalCount = 0;
    customerService.getCustomerPayments.calls.reset();
    component.onDownloadReport('pdf');
    expect(toastrService.error).toHaveBeenCalledWith('TRANSLATED');
    expect(customerService.getCustomerPayments).not.toHaveBeenCalled();
  }));

  it('onDownloadReport email path fetches all rows with pageSize 0 and opens the send-email dialog', fakeAsync(() => {
    create();
    tick(1100);
    let downloadArgs: any = null;
    customerService.getCustomerPayments.and.callFake((resource: any) => {
      downloadArgs = { ...resource };
      return of(paginated(payments));
    });
    dialog.open.and.returnValue({ afterClosed: () => of(void 0) } as any);
    component.onDownloadReport('email');
    expect(downloadArgs.pageSize).toBe(0);
    expect(component.customerResource.pageSize).toBe(10);
    expect(dialog.open).toHaveBeenCalledWith(
      jasmine.anything(),
      jasmine.objectContaining({
        data: jasmine.objectContaining({ name: 'TRANSLATED.pdf', contentType: 'application/pdf' }),
      })
    );
  }));
});
