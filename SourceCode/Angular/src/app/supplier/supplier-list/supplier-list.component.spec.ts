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

import { SupplierListComponent } from './supplier-list.component';
import { SupplierService } from '../supplier.service';
import { SupplierStore } from '../supplier-store';
import { PurchaseOrderService } from '../../purchase-order/purchase-order.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { ImportExportService } from '@core/services/import-export.service';
import { Supplier } from '@core/domain-classes/supplier';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';
import { Country } from '@core/domain-classes/country';

describe('SupplierListComponent', () => {
  let component: SupplierListComponent;
  let fixture: ComponentFixture<SupplierListComponent>;
  let supplierService: jasmine.SpyObj<SupplierService>;
  let purchaseOrderService: jasmine.SpyObj<PurchaseOrderService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let importExportService: jasmine.SpyObj<ImportExportService>;

  const suppliers: Supplier[] = [
    { id: 's1', supplierName: 'Acme', email: 'acme@x.com', mobileNo: '0300', website: 'acme.com' } as unknown as Supplier,
    { id: 's2', supplierName: 'Globex', email: 'globex@x.com', mobileNo: '0301', website: 'globex.com' } as unknown as Supplier,
  ];

  function paginated<T>(body: T[], header: Record<string, number> = {}): HttpResponse<T[]> {
    return new HttpResponse({
      body,
      headers: new HttpHeaders({
        'X-Pagination': JSON.stringify({ totalCount: body.length, pageSize: 30, skip: 0, ...header }),
      }),
    });
  }

  beforeEach(() => {
    supplierService = jasmine.createSpyObj<SupplierService>('SupplierService', ['getSuppliers', 'deleteSupplier']);
    supplierService.deleteSupplier.and.returnValue(of(void 0));
    purchaseOrderService = jasmine.createSpyObj<PurchaseOrderService>('PurchaseOrderService', ['getAllPurchaseOrder']);
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    commonDialogService = jasmine.createSpyObj<CommonDialogService>('CommonDialogService', ['deleteConformationDialog']);
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getPageHelperText', 'getCountry', 'getCityByName']);
    commonService.getCountry.and.returnValue(of([]));
    supplierService.getSuppliers.and.returnValue(of(paginated(suppliers)));
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open', 'closeAll']);
    importExportService = jasmine.createSpyObj<ImportExportService>('ImportExportService', ['exportData', 'downloadFile']);
    const securityService = jasmine.createSpyObj('SecurityService', ['hasClaim']);
    (securityService as any).currencyCode = 'USD';

    TestBed.configureTestingModule({
      imports: [SupplierListComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        CurrencyPipe,
        { provide: SupplierService, useValue: supplierService },
        { provide: PurchaseOrderService, useValue: purchaseOrderService },
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
    fixture = TestBed.createComponent(SupplierListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and load suppliers on init', fakeAsync(() => {
    supplierService.getSuppliers.and.returnValue(of(paginated(suppliers, { totalCount: 42 })));
    create();
    tick(400);
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(supplierService.getSuppliers).toHaveBeenCalledOnceWith(jasmine.objectContaining({ pageSize: 30, skip: 0, orderBy: 'supplierName asc' }));
    expect(component.supplierStore.suppliers().length).toBe(2);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('Acme');
    expect(text).toContain('Globex');
    expect(component.paginator.length).toBe(42);
  }));

  it('loads countries for the autocomplete', fakeAsync(() => {
    commonService.getCountry.and.returnValue(of([{ id: 'pk', countryName: 'Pakistan' } as Country]));
    create();
    tick(400);
    expect(component.countryList.length).toBe(1);
    let filtered: Country[] = [];
    component.filteredCountryList.subscribe(c => (filtered = c));
    component.countryControl.setValue('pak');
    expect(filtered.length).toBe(1);
    expect(filtered[0].countryName).toBe('Pakistan');
    component.countryControl.setValue('zz');
    expect(filtered.length).toBe(0);
  }));

  it('name filter reloads with supplierName and reset skip', fakeAsync(() => {
    supplierService.getSuppliers.and.returnValues(of(paginated(suppliers)), of(paginated(suppliers)));
    create();
    tick(400);
    component.NameFilter = 'acme';
    tick(700);
    tick(400);
    tick(400);
    const args = supplierService.getSuppliers.calls.mostRecent().args[0];
    expect(args.supplierName).toBe('acme');
    expect(args.skip).toBe(0);
  }));

  it('delete confirmed removes supplier and reloads list', fakeAsync(() => {
    supplierService.getSuppliers.and.returnValue(of(paginated(suppliers)));
    create();
    tick(400);
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    component.deleteSupplier(suppliers[0]);
    tick(400);
    expect(commonDialogService.deleteConformationDialog).toHaveBeenCalledWith(jasmine.stringContaining('Acme'));
    expect(supplierService.deleteSupplier).toHaveBeenCalledWith('s1');
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
    expect(supplierService.getSuppliers.calls.count()).toBe(2);
  }));

  it('declined delete confirmation does not call delete api', fakeAsync(() => {
    supplierService.getSuppliers.and.returnValue(of(paginated(suppliers)));
    create();
    tick(400);
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    component.deleteSupplier(suppliers[0]);
    tick(400);
    expect(supplierService.deleteSupplier).not.toHaveBeenCalled();
    expect(supplierService.getSuppliers.calls.count()).toBe(1);
  }));

  it('sort change reloads with sort order and resets page index', fakeAsync(() => {
    supplierService.getSuppliers.and.returnValues(of(paginated(suppliers)), of(paginated(suppliers)));
    create();
    tick(400);
    component.sort.active = 'email';
    component.sort.direction = 'desc';
    component.sort.sortChange.emit({ active: 'email', direction: 'desc' } as Sort);
    tick(400);
    const args = supplierService.getSuppliers.calls.mostRecent().args[0];
    expect(args.orderBy).toBe('email desc');
    expect(args.skip).toBe(0);
  }));

  it('paginator page reloads with computed skip and page size', fakeAsync(() => {
    supplierService.getSuppliers.and.returnValues(of(paginated(suppliers)), of(paginated(suppliers)));
    create();
    tick(400);
    component.paginator.pageIndex = 1;
    component.paginator.pageSize = 10;
    component.paginator.page.emit({ pageIndex: 1, pageSize: 10, length: 42 } as PageEvent);
    tick(400);
    const args = supplierService.getSuppliers.calls.mostRecent().args[0];
    expect(args.skip).toBe(10);
    expect(args.pageSize).toBe(10);
  }));

  it('toggleRow expands row and loads nested supplier purchase orders', fakeAsync(() => {
    supplierService.getSuppliers.and.returnValue(of(paginated(suppliers)));
    const pos = [    { id: 'po1', orderNumber: 'PO-1', poCreatedDate: '2026-01-01T00:00:00Z', paymentStatus: 0 } as unknown as PurchaseOrder];
    purchaseOrderService.getAllPurchaseOrder.and.returnValue(of(paginated(pos, { pageSize: 5 })));
    create();
    tick(400);
    fixture.detectChanges();
    component.toggleRow(suppliers[0]);
    fixture.detectChanges();
    expect(component.expandedElement).toBe(suppliers[0]);
    expect(purchaseOrderService.getAllPurchaseOrder).toHaveBeenCalledWith(jasmine.objectContaining({ supplierId: 's1', pageSize: 5 }));
  }));

  it('openImportDialog opens dialog for suppliers and refreshes on close', fakeAsync(() => {
    supplierService.getSuppliers.and.returnValues(of(paginated(suppliers)), of(paginated(suppliers)));
    create();
    tick(400);
    dialog.open.and.returnValue({ afterClosed: () => of(true) } as any);
    component.openImportDialog();
    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({ data: { entityType: 'suppliers', entityName: 'Supplier' } }));
    tick(400);
    expect(supplierService.getSuppliers.calls.count()).toBe(2);
  }));

  it('exportData downloads csv file and reports success', fakeAsync(() => {
    supplierService.getSuppliers.and.returnValue(of(paginated(suppliers)));
    importExportService.exportData.and.returnValue(of(new Blob(['csv'])));
    create();
    tick(400);
    component.exportData('csv');
    expect(importExportService.exportData).toHaveBeenCalledWith('suppliers', 'csv');
    expect(importExportService.downloadFile).toHaveBeenCalledWith(jasmine.any(Blob), jasmine.stringMatching(/^Suppliers_\d{4}-\d{2}-\d{2}\.csv$/));
    expect(toastrService.success).toHaveBeenCalledWith('Data exported successfully');
  }));

  it('exportData failure reports error', fakeAsync(() => {
    supplierService.getSuppliers.and.returnValue(of(paginated(suppliers)));
    importExportService.exportData.and.returnValue(throwError(() => ({ message: 'boom' })));
    create();
    tick(400);
    component.exportData('excel');
    expect(toastrService.error).toHaveBeenCalledWith('Export failed: boom');
  }));
});
