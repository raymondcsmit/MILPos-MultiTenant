import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { BehaviorSubject, of } from 'rxjs';

import { StockReportComponent } from './stock-report.component';
import { InventoryService } from '../../inventory/inventory.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { Inventory } from '@core/domain-classes/inventory';

describe('StockReportComponent', () => {
  let component: StockReportComponent;
  let fixture: ComponentFixture<StockReportComponent>;
  let inventoryService: jasmine.SpyObj<InventoryService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;

  const stocks: Inventory[] = [
    {
      productId: 'p1',
      currentStock: 5,
      pricePerUnit: 10,
      productName: 'Aspirin',
      unitName: 'Box',
      averagePurchasePrice: 8,
      averageSalesPrice: 12,
      unitId: 'u1',
      locationId: 'loc1',
      type: '',
    } as Inventory,
    {
      productId: 'p2',
      currentStock: 0,
      pricePerUnit: 2,
      productName: 'Bandage',
      unitName: 'Pack',
      averagePurchasePrice: 1,
      averageSalesPrice: 3,
      unitId: 'u2',
      locationId: 'loc1',
      type: '',
    } as Inventory,
  ];

  function paginated(body: Inventory[]): HttpResponse<Inventory[]> {
    return new HttpResponse({
      body,
      headers: new HttpHeaders({
        'X-Pagination': JSON.stringify({ totalCount: body.length, pageSize: 50, skip: 0 }),
      }),
    });
  }

  beforeEach(() => {
    inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', ['getInventories', 'getInventoriesReport']);
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getLocationsForCurrentUser']);
    commonService.getLocationsForCurrentUser.and.returnValue(of({ locations: [{ id: 'loc1', name: 'Main' } as any], selectedLocation: 'loc1' } as any));
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    const securityService = jasmine.createSpyObj('SecurityService', ['hasClaim']);
    (securityService as any).currencyCode = 'USD';
    securityService.hasClaim.and.returnValue(true);

    TestBed.configureTestingModule({
      imports: [StockReportComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        CurrencyPipe,
        { provide: InventoryService, useValue: inventoryService },
        { provide: CommonService, useValue: commonService },
        { provide: SecurityService, useValue: securityService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialog, useValue: dialog },
      ],
    });
  });

  function create(): void {
    inventoryService.getInventories.and.returnValue(of(paginated(stocks)));
    fixture = TestBed.createComponent(StockReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and load stock for the selected location after the location filter debounce', fakeAsync(() => {
    create();
    expect(component).toBeTruthy();
    expect(inventoryService.getInventories).not.toHaveBeenCalled();
    tick(1100);
    expect(inventoryService.getInventories).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({ locationId: 'loc1', pageSize: 50, skip: 0, orderBy: 'productName asc' })
    );
    expect(component.stocks.length).toBe(2);
    fixture.detectChanges();
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('Aspirin');
    expect(text).toContain('Bandage');
  }));

  it('product name and location filters debounce into the resource with reset skip', fakeAsync(() => {
    create();
    tick(1100);
    inventoryService.getInventories.calls.reset();
    component.ProductNameFilter = 'asp';
    tick(1000);
    let args = inventoryService.getInventories.calls.mostRecent().args[0];
    expect(args.productName).toBe(escape('asp'));
    expect(args.skip).toBe(0);
    expect(component.paginator.pageIndex).toBe(0);

    component.LocationFilter = 'loc2';
    tick(1000);
    args = inventoryService.getInventories.calls.mostRecent().args[0];
    expect(args.locationId).toBe('loc2');
  }));

  it('sort and page handlers recompute orderBy and skip', fakeAsync(() => {
    create();
    tick(1100);
    inventoryService.getInventories.and.returnValue(of(new HttpResponse({ body: stocks })));
    inventoryService.getInventories.calls.reset();
    component.sort.active = 'productName';
    component.sort.direction = 'desc';
    component.sort.sortChange.emit({ active: 'productName', direction: 'desc' } as Sort);
    let args = inventoryService.getInventories.calls.mostRecent().args[0];
    expect(args.orderBy).toBe('productName desc');
    expect(args.skip).toBe(0);

    component.paginator.pageIndex = 1;
    component.paginator.pageSize = 25;
    component.paginator.page.emit({ pageIndex: 1, pageSize: 25, length: 30 } as PageEvent);
    args = inventoryService.getInventories.calls.mostRecent().args[0];
    expect(args.skip).toBe(25);
    expect(args.pageSize).toBe(25);
  }));

  it('toggleRow expands and collapses the stock row', fakeAsync(() => {
    create();
    tick(1100);
    component.toggleRow(component.stocks[0]);
    expect(component.expandedElement).toBe(component.stocks[0]);
    component.toggleRow(component.stocks[0]);
    expect(component.expandedElement).toBeNull();
  }));

  it('onDownloadReport reports no data when the loaded report is empty', fakeAsync(() => {
    create();
    tick(1100);
    component.inventoryResource.totalCount = 0;
    inventoryService.getInventoriesReport.calls.reset();
    component.onDownloadReport('pdf');
    expect(toastrService.error).toHaveBeenCalledWith('TRANSLATED');
    expect(inventoryService.getInventoriesReport).not.toHaveBeenCalled();
  }));

  it('onDownloadReport email path fetches the report rows and opens the send-email dialog', fakeAsync(() => {
    create();
    tick(1100);
    inventoryService.getInventoriesReport.and.returnValue(of(paginated(stocks)));
    dialog.open.and.returnValue({ afterClosed: () => of(void 0) } as any);
    component.onDownloadReport('email');
    expect(inventoryService.getInventoriesReport).toHaveBeenCalledWith(component.inventoryResource);
    expect(dialog.open).toHaveBeenCalledWith(
      jasmine.anything(),
      jasmine.objectContaining({
        data: jasmine.objectContaining({ name: 'TRANSLATED.pdf', contentType: 'application/pdf' }),
      })
    );
  }));
});
