import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CurrencyPipe } from '@angular/common';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { InventoryHistoryListComponent } from './inventory-history-list.component';
import { InventoryService } from '../../inventory.service';
import { StockTransferService } from '../../../stock-transfer/stock-transfer.service';
import { CommonService } from '@core/services/common.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { Inventory } from '@core/domain-classes/inventory';
import { InventoryHistory } from '@core/domain-classes/inventory-history';
import { InventoryHistoryResourceParameter } from '@core/domain-classes/inventory-history-resource-parameter';
import { StockTransfer } from '@core/domain-classes/stockTransfer';

describe('InventoryHistoryListComponent', () => {
  let component: InventoryHistoryListComponent;
  let fixture: ComponentFixture<InventoryHistoryListComponent>;
  let inventoryService: jasmine.SpyObj<InventoryService>;
  let stockTransferService: jasmine.SpyObj<StockTransferService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let capturedArgs: InventoryHistoryResourceParameter[];

  const inventory = { id: 'i1', productId: 'p1', productName: 'Coke', locationId: 'loc1', currentStock: 5 } as unknown as Inventory;

  const histories: InventoryHistory[] = [
    { id: 'h1', stock: 5, pricePerUnit: 10, createdDate: '2026-01-01T00:00:00Z', createdByName: 'admin', inventorySource: 0 } as unknown as InventoryHistory,
    { id: 'h2', stock: 3, pricePerUnit: 10, createdDate: '2026-01-02T00:00:00Z', createdByName: 'admin', inventorySource: 3, stockTransferId: 'st1' } as unknown as InventoryHistory,
  ];

  function paginated(header: Record<string, number> = {}): HttpResponse<InventoryHistory[]> {
    return new HttpResponse({
      body: histories,
      headers: new HttpHeaders({
        'X-Pagination': JSON.stringify({ totalCount: 20, pageSize: 10, skip: 0, ...header }),
      }),
    });
  }

  beforeEach(() => {
    capturedArgs = [];
    inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', ['getInventoryHistories']);
    inventoryService.getInventoryHistories.and.callFake((p: InventoryHistoryResourceParameter) => {
      capturedArgs.push({ ...p });
      return of(paginated());
    });
    stockTransferService = jasmine.createSpyObj<StockTransferService>('StockTransferService', ['getStockTransfer']);
    stockTransferService.getStockTransfer.and.returnValue(of({ id: 'st1' } as StockTransfer));
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open', 'closeAll']);
    const translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = of('ltr');

    TestBed.configureTestingModule({
      imports: [InventoryHistoryListComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        CurrencyPipe,
        { provide: InventoryService, useValue: inventoryService },
        { provide: StockTransferService, useValue: stockTransferService },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: TranslationService, useValue: translationService },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: MatDialog, useValue: dialog },
      ],
    });
    fixture = TestBed.createComponent(InventoryHistoryListComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('inventory', inventory);
    fixture.detectChanges();
  });

  it('should create and load history for product and location', () => {
    expect(component).toBeTruthy();
    expect(capturedArgs.length).toBe(1);
    expect(capturedArgs[0]).toEqual(jasmine.objectContaining({
      productId: 'p1',
      locationId: 'loc1',
      pageSize: 10,
      orderBy: 'createdDate desc',
    }));
    expect(component.inventoryHistoryResource.totalCount).toBe(20);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('admin');
  });

  it('paginator page reloads with computed skip', () => {
    component.paginator.nextPage();
    expect(capturedArgs.length).toBe(2);
    expect(capturedArgs[1].skip).toBe(10);
    expect(capturedArgs[1].pageSize).toBe(10);
  });

  it('sort change resets page index and reloads with sort order', () => {
    component.paginator.pageIndex = 2;
    component.sort.active = 'createdDate';
    component.sort.direction = 'asc';
    component.sort.sortChange.emit({ active: 'createdDate', direction: 'asc' } as any);
    expect(capturedArgs.length).toBe(2);
    expect(capturedArgs[1].orderBy).toBe('createdDate asc');
    expect(capturedArgs[1].skip).toBe(0);
    expect(component.paginator.pageIndex).toBe(0);
  });

  it('viewTransferDetail loads transfer and opens invoice dialog', () => {
    component.viewTransferDetail(histories[1]);
    expect(stockTransferService.getStockTransfer).toHaveBeenCalledWith('st1');
    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({ data: jasmine.objectContaining({ id: 'st1' }) }));
  });
});
