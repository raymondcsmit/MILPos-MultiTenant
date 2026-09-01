import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { InventoryListComponent } from './inventory-list.component';
import { InventoryService } from '../inventory.service';
import { CommonService } from '@core/services/common.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { Inventory } from '@core/domain-classes/inventory';
import { InventoryResourceParameter } from '@core/domain-classes/inventory-resource-parameter';
import { ManageInventoryComponent } from '../manage-inventory/manage-inventory.component';

describe('InventoryListComponent', () => {
  let component: InventoryListComponent;
  let fixture: ComponentFixture<InventoryListComponent>;
  let inventoryService: jasmine.SpyObj<InventoryService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let router: Router;
  let capturedArgs: InventoryResourceParameter[];

  const inventories: Inventory[] = [
    { id: 'i1', productId: 'p1', productName: 'Coke', locationId: 'loc1', currentStock: 5 } as unknown as Inventory,
    { id: 'i2', productId: 'p2', productName: 'Pepsi', locationId: 'loc1', currentStock: 7 } as unknown as Inventory,
  ];

  function paginated(header: Record<string, number> = {}): HttpResponse<Inventory[]> {
    return new HttpResponse({
      body: inventories,
      headers: new HttpHeaders({
        'X-Pagination': JSON.stringify({ totalCount: 12, pageSize: 50, skip: 0, ...header }),
      }),
    });
  }

  beforeEach(() => {
    capturedArgs = [];
    inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', ['getInventories']);
    inventoryService.getInventories.and.callFake((p: InventoryResourceParameter) => {
      capturedArgs.push({ ...p });
      return of(paginated());
    });
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getPageHelperText', 'getLocationsForCurrentUser']);
    commonService.getLocationsForCurrentUser.and.returnValue(of({ locations: [{ id: 'loc1', name: 'Main' }], selectedLocation: 'loc1' } as any));
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open', 'closeAll']);
    const translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();

    TestBed.configureTestingModule({
      imports: [InventoryListComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: InventoryService, useValue: inventoryService },
        { provide: CommonService, useValue: commonService },
        { provide: TranslationService, useValue: translationService },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: MatDialog, useValue: dialog },
      ],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  function create(): void {
    fixture = TestBed.createComponent(InventoryListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function drainInitialLoad(): void {
    tick(1200);
    tick(400);
  }

  it('should create; initial load happens via location filter with defaulted page size', fakeAsync(() => {
    create();
    expect(capturedArgs.length).toBe(0);
    drainInitialLoad();
    fixture.detectChanges();
    expect(capturedArgs.length).toBe(1);
    expect(capturedArgs[0]).toEqual(jasmine.objectContaining({
      locationId: 'loc1',
      orderBy: 'productName asc',
      skip: 0,
      pageSize: 0,
    }));
    expect(component.inventorys.length).toBe(2);
    expect(component.inventoryResource.pageSize).toBe(50);
    expect(component.inventoryResource.totalCount).toBe(12);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('Coke');
    expect(text).toContain('Pepsi');
  }));

  it('product name filter reloads with escaped name and reset skip', fakeAsync(() => {
    create();
    drainInitialLoad();
    capturedArgs = [];
    component.ProductNameFilter = 'coke';
    tick(1100);
    expect(capturedArgs.length).toBe(1);
    expect(capturedArgs[0].productName).toBe(escape('coke'));
    expect(capturedArgs[0].skip).toBe(0);
  }));

  it('sort change resets page index and reloads with sort order', fakeAsync(() => {
    create();
    drainInitialLoad();
    capturedArgs = [];
    component.paginator.pageIndex = 3;
    component.sort.active = 'productName';
    component.sort.direction = 'desc';
    component.sort.sortChange.emit({ active: 'productName', direction: 'desc' } as any);
    expect(capturedArgs.length).toBe(1);
    expect(capturedArgs[0].orderBy).toBe('productName desc');
    expect(capturedArgs[0].skip).toBe(0);
    expect(component.paginator.pageIndex).toBe(0);
  }));

  it('addInvenotry opens manage dialog and reloads on close', fakeAsync(() => {
    create();
    drainInitialLoad();
    capturedArgs = [];
    dialog.open.and.returnValue({ afterClosed: () => of(true) } as any);
    component.addInvenotry(null);
    expect(dialog.open).toHaveBeenCalledWith(ManageInventoryComponent, jasmine.objectContaining({
      data: jasmine.objectContaining({ locations: component.locations, selectedLocation: 'loc1' }),
    }));
    expect(capturedArgs.length).toBe(1);
  }));

  it('closed manage dialog without result does not reload', fakeAsync(() => {
    create();
    drainInitialLoad();
    capturedArgs = [];
    dialog.open.and.returnValue({ afterClosed: () => of(false) } as any);
    component.addInvenotry(null);
    expect(capturedArgs.length).toBe(0);
  }));

  it('navigateToBulkUpdate and BulkAdjust route', () => {
    create();
    component.navigateToBulkUpdate();
    expect(router.navigate).toHaveBeenCalledWith(['/inventory/bulk-update']);
    component.navigateToBulkAdjust();
    expect(router.navigate).toHaveBeenCalledWith(['/inventory/bulk-adjust']);
  });

  it('toggleRow expands and collapses the row', () => {
    create();
    component.toggleRow(inventories[0]);
    expect(component.expandedElement).toBe(inventories[0]);
    component.toggleRow(inventories[0]);
    expect(component.expandedElement).toBeNull();
  });
});
