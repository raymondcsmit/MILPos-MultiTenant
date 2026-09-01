import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { CustomerListComponent } from './customer-list.component';
import { CustomerService } from '../customer.service';
import { CustomerStore } from '../customer-store';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { ImportExportService } from '@core/services/import-export.service';
import { SalesOrderService } from '../../sales-order/sales-order.service';
import { Customer } from '@core/domain-classes/customer';
import { SalesOrder } from '@core/domain-classes/sales-order';

describe('CustomerListComponent', () => {
  let component: CustomerListComponent;
  let fixture: ComponentFixture<CustomerListComponent>;
  let customerService: jasmine.SpyObj<CustomerService>;
  let salesOrderService: jasmine.SpyObj<SalesOrderService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let importExportService: jasmine.SpyObj<ImportExportService>;

  const customers: Customer[] = [
    { id: 'c1', customerName: 'Coke', email: 'coke@x.com', contactPerson: 'Ali', mobileNo: '0300', website: 'coke.com' } as Customer,
    { id: 'c2', customerName: 'Pepsi', email: 'pepsi@x.com', contactPerson: 'Bo', mobileNo: '0301', website: 'pepsi.com' } as Customer,
  ];

  function paginated<T>(body: T[], header: Record<string, number> = {}): HttpResponse<T[]> {
    return new HttpResponse({
      body,
      headers: new HttpHeaders({
        'X-Pagination': JSON.stringify({ totalCount: body.length, pageSize: 15, skip: 0, ...header }),
      }),
    });
  }

  beforeEach(() => {
    customerService = jasmine.createSpyObj<CustomerService>('CustomerService', ['getCustomers', 'deleteCustomer']);
    customerService.deleteCustomer.and.returnValue(of(void 0));
    salesOrderService = jasmine.createSpyObj<SalesOrderService>('SalesOrderService', ['getAllSalesOrder']);
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    commonDialogService = jasmine.createSpyObj<CommonDialogService>('CommonDialogService', ['deleteConformationDialog']);
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getPageHelperText', 'getCountry', 'getCityByName']);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open', 'closeAll']);
    importExportService = jasmine.createSpyObj<ImportExportService>('ImportExportService', ['exportData', 'downloadFile']);
    const securityService = jasmine.createSpyObj('SecurityService', ['hasClaim']);
    (securityService as any).currencyCode = 'USD';

    TestBed.configureTestingModule({
      imports: [CustomerListComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        CurrencyPipe,
        { provide: CustomerService, useValue: customerService },
        { provide: SalesOrderService, useValue: salesOrderService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: CommonDialogService, useValue: commonDialogService },
        { provide: CommonService, useValue: commonService },
        { provide: SecurityService, useValue: securityService },
        { provide: MatDialog, useValue: dialog },
        { provide: ImportExportService, useValue: importExportService },
      ],
    });
  });

  function create(): void {
    fixture = TestBed.createComponent(CustomerListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and load customers on init', fakeAsync(() => {
    customerService.getCustomers.and.returnValue(of(paginated(customers, { totalCount: 42 })));
    create();
    tick(400);
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(customerService.getCustomers).toHaveBeenCalledOnceWith(jasmine.objectContaining({ pageSize: 15, skip: 0, orderBy: 'customerName asc' }));
    expect(component.customerStore.customers().length).toBe(2);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('Coke');
    expect(text).toContain('Pepsi');
    expect(component.paginator.length).toBe(42);
  }));

  it('name filter reloads with customerName and reset skip', fakeAsync(() => {
    customerService.getCustomers.and.returnValues(of(paginated(customers)), of(paginated(customers)));
    create();
    tick(400);
    component.NameFilter = 'ali';
    tick(700);
    tick(400);
    tick(400);
    const args = customerService.getCustomers.calls.mostRecent().args[0];
    expect(args.customerName).toBe('ali');
    expect(args.skip).toBe(0);
  }));

  it('delete confirmed removes customer and reloads list', fakeAsync(() => {
    customerService.getCustomers.and.returnValue(of(paginated(customers)));
    create();
    tick(400);
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    component.deleteCustomer(customers[0]);
    tick(400);
    expect(commonDialogService.deleteConformationDialog).toHaveBeenCalledWith(jasmine.stringContaining('Coke'));
    expect(customerService.deleteCustomer).toHaveBeenCalledWith('c1');
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
    expect(customerService.getCustomers.calls.count()).toBe(2);
  }));

  it('declined delete confirmation does not call delete api', fakeAsync(() => {
    customerService.getCustomers.and.returnValue(of(paginated(customers)));
    create();
    tick(400);
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    component.deleteCustomer(customers[0]);
    tick(400);
    expect(customerService.deleteCustomer).not.toHaveBeenCalled();
    expect(customerService.getCustomers.calls.count()).toBe(1);
  }));

  it('sort change reloads with sort order and resets page index', fakeAsync(() => {
    customerService.getCustomers.and.returnValues(of(paginated(customers)), of(paginated(customers)));
    create();
    tick(400);
    component.sort.active = 'email';
    component.sort.direction = 'desc';
    component.sort.sortChange.emit({ active: 'email', direction: 'desc' } as Sort);
    tick(400);
    const args = customerService.getCustomers.calls.mostRecent().args[0];
    expect(args.orderBy).toBe('email desc');
    expect(args.skip).toBe(0);
    expect(component.paginator.pageIndex).toBe(0);
  }));

  it('paginator page reloads with computed skip and page size', fakeAsync(() => {
    customerService.getCustomers.and.returnValues(of(paginated(customers)), of(paginated(customers)));
    create();
    tick(400);
    component.paginator.pageIndex = 1;
    component.paginator.pageSize = 10;
    component.paginator.page.emit({ pageIndex: 1, pageSize: 10, length: 42 } as PageEvent);
    tick(400);
    const args = customerService.getCustomers.calls.mostRecent().args[0];
    expect(args.skip).toBe(10);
    expect(args.pageSize).toBe(10);
  }));

  it('toggleRow expands row and loads nested customer sales orders', fakeAsync(() => {
    customerService.getCustomers.and.returnValue(of(paginated(customers)));
    const sos = [{ id: 'so1', orderNumber: 'SO-1', soCreatedDate: '2026-01-01T00:00:00Z', paymentStatus: 0 } as unknown as SalesOrder];
    salesOrderService.getAllSalesOrder.and.returnValue(of(paginated(sos, { pageSize: 5 })));
    create();
    tick(400);
    fixture.detectChanges();
    component.toggleRow(customers[0]);
    fixture.detectChanges();
    expect(component.expandedElement).toBe(customers[0]);
    expect(salesOrderService.getAllSalesOrder).toHaveBeenCalledWith(jasmine.objectContaining({ customerId: 'c1', pageSize: 5 }));
  }));

  it('toggleRow again collapses row', fakeAsync(() => {
    customerService.getCustomers.and.returnValue(of(paginated(customers)));
    salesOrderService.getAllSalesOrder.and.returnValue(of(paginated([])));
    create();
    tick(400);
    fixture.detectChanges();
    component.toggleRow(customers[0]);
    component.toggleRow(customers[0]);
    expect(component.expandedElement).toBeNull();
  }));

  it('openImportDialog opens dialog for customers and refreshes on close', fakeAsync(() => {
    customerService.getCustomers.and.returnValues(of(paginated(customers)), of(paginated(customers)));
    create();
    tick(400);
    dialog.open.and.returnValue({ afterClosed: () => of(true) } as any);
    component.openImportDialog();
    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({ data: { entityType: 'customers', entityName: 'Customer' } }));
    tick(400);
    expect(customerService.getCustomers.calls.count()).toBe(2);
  }));

  it('exportData downloads csv file and reports success', fakeAsync(() => {
    customerService.getCustomers.and.returnValue(of(paginated(customers)));
    importExportService.exportData.and.returnValue(of(new Blob(['csv'])));
    create();
    tick(400);
    component.exportData('csv');
    expect(importExportService.exportData).toHaveBeenCalledWith('customers', 'csv');
    expect(importExportService.downloadFile).toHaveBeenCalledWith(jasmine.any(Blob), jasmine.stringMatching(/^Customers_\d{4}-\d{2}-\d{2}\.csv$/));
    expect(toastrService.success).toHaveBeenCalledWith('Data exported successfully');
  }));

  it('exportData failure reports error', fakeAsync(() => {
    customerService.getCustomers.and.returnValue(of(paginated(customers)));
    importExportService.exportData.and.returnValue(throwError(() => ({ message: 'boom' })));
    create();
    tick(400);
    component.exportData('excel');
    expect(toastrService.error).toHaveBeenCalledWith('Export failed: boom');
  }));
});
