import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { BehaviorSubject, of } from 'rxjs';

import { InventoryHistoryListComponent } from './inventory-history-list.component';
import { InventoryService } from '../../../inventory/inventory.service';
import { StockTransferService } from '../../../stock-transfer/stock-transfer.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { TranslationService } from '@core/services/translation.service';
import { Inventory } from '@core/domain-classes/inventory';
import { InventoryHistory } from '@core/domain-classes/inventory-history';
import { StockTransfer } from '@core/domain-classes/stockTransfer';

describe('InventoryHistoryListComponent', () => {
  let component: InventoryHistoryListComponent;
  let fixture: ComponentFixture<InventoryHistoryListComponent>;
  let inventoryService: jasmine.SpyObj<InventoryService>;
  let stockTransferService: jasmine.SpyObj<StockTransferService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  const inventory = { productId: 'p1', locationId: 'loc1', productName: 'Aspirin' } as Inventory;

  const histories: InventoryHistory[] = [
    {
      id: 'h1',
      productId: 'p1',
      stock: 5,
      inventorySource: 1,
      pricePerUnit: 10,
      createdDate: '2026-01-05T00:00:00Z',
      salesOrderNumber: 'SO-1',
    } as InventoryHistory,
    {
      id: 'h2',
      productId: 'p1',
      stock: -2,
      inventorySource: 3,
      pricePerUnit: 8,
      createdDate: '2026-01-06T00:00:00Z',
      stockTransferNo: 'ST-1',
      stockTransferId: 'st1',
    } as InventoryHistory,
  ];

  function paginated(body: InventoryHistory[]): HttpResponse<InventoryHistory[]> {
    return new HttpResponse({
      body,
      headers: new HttpHeaders({
        'X-Pagination': JSON.stringify({ totalCount: body.length, pageSize: 10, skip: 0 }),
      }),
    });
  }

  beforeEach(() => {
    inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', ['getInventoryHistories']);
    stockTransferService = jasmine.createSpyObj<StockTransferService>('StockTransferService', ['getStockTransfer']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    const securityService = jasmine.createSpyObj('SecurityService', ['hasClaim']);
    (securityService as any).currencyCode = 'USD';
    securityService.hasClaim.and.returnValue(true);

    TestBed.configureTestingModule({
      imports: [InventoryHistoryListComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        CurrencyPipe,
        { provide: InventoryService, useValue: inventoryService },
        { provide: StockTransferService, useValue: stockTransferService },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: TranslationService, useValue: translationService },
        { provide: SecurityService, useValue: securityService },
        { provide: MatDialog, useValue: dialog },
      ],
    });
  });

  function create(): void {
    inventoryService.getInventoryHistories.and.returnValue(of(paginated(histories)));
    fixture = TestBed.createComponent(InventoryHistoryListComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('inventory', inventory);
    fixture.detectChanges();
  }

  it('should create and load history for the bound inventory product and location', () => {
    create();
    expect(component).toBeTruthy();
    expect(inventoryService.getInventoryHistories).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({ productId: 'p1', locationId: 'loc1', pageSize: 10, skip: 0, orderBy: 'createdDate desc' })
    );
    expect(component.dataSource.count).toBe(2);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('ST-1');
    expect(text).toContain('2 of 2');
  });

  it('sort and page handlers recompute orderBy and skip', fakeAsync(() => {
    create();
    inventoryService.getInventoryHistories.and.returnValue(of(new HttpResponse({ body: histories })));
    inventoryService.getInventoryHistories.calls.reset();
    component.sort.active = 'stock';
    component.sort.direction = 'asc';
    component.sort.sortChange.emit({ active: 'stock', direction: 'asc' } as Sort);
    let args = inventoryService.getInventoryHistories.calls.mostRecent().args[0];
    expect(args.orderBy).toBe('stock asc');
    expect(args.skip).toBe(0);

    component.paginator.pageIndex = 2;
    component.paginator.pageSize = 10;
    component.paginator.page.emit({ pageIndex: 2, pageSize: 10, length: 25 } as PageEvent);
    args = inventoryService.getInventoryHistories.calls.mostRecent().args[0];
    expect(args.skip).toBe(20);
    expect(args.pageSize).toBe(10);
  }));

  it('viewTransferDetail fetches the stock transfer and opens its invoice dialog', () => {
    create();
    const transfer = { id: 'st1', stockTransferNumber: 'ST-1' } as unknown as StockTransfer;
    stockTransferService.getStockTransfer.and.returnValue(of(transfer));
    component.viewTransferDetail(histories[1]);
    expect(stockTransferService.getStockTransfer).toHaveBeenCalledWith('st1');
    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({ data: transfer }));
  });
});
