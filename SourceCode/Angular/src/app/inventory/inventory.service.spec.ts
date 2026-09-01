import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryService } from './inventory.service';
import { InventoryResourceParameter } from '@core/domain-classes/inventory-resource-parameter';
import { InventoryHistoryResourceParameter } from '@core/domain-classes/inventory-history-resource-parameter';

describe('InventoryService', () => {
  let service: InventoryService;
  let httpMock: HttpTestingController;

  function makeParams(overrides: Partial<InventoryResourceParameter> = {}): InventoryResourceParameter {
    const p = new InventoryResourceParameter();
    p.fields = '';
    p.orderBy = 'productName asc';
    p.pageSize = 25;
    p.skip = 0;
    p.searchQuery = '';
    p.name = '';
    p.productName = '';
    p.locationId = '';
    Object.assign(p, overrides);
    return p;
  }

  function makeHistoryParams(overrides: Partial<InventoryHistoryResourceParameter> = {}): InventoryHistoryResourceParameter {
    const p = new InventoryHistoryResourceParameter();
    p.fields = '';
    p.orderBy = 'createdDate desc';
    p.pageSize = 25;
    p.skip = 0;
    p.searchQuery = '';
    p.name = '';
    p.productId = 'p1';
    p.locationId = 'l1';
    Object.assign(p, overrides);
    return p;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), InventoryService],
    });
    service = TestBed.inject(InventoryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  function expectParams(req: any, expected: Record<string, string>) {
    const actual = req.request.params;
    Object.keys(expected).forEach((k) => {
      expect(actual.get(k)).toBe(expected[k]);
    });
  }

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getInventories', () => {
    it('GETs ProductStock with observe response and full params', () => {
      const body = [{ id: 'i1' }];
      let result: any;
      service.getInventories(makeParams({ locationId: 'l1', productName: 'Widget' })).subscribe((r) => (result = r));
      const req = expectUrl('GET', 'ProductStock');
      expectParams(req, {
        fields: '',
        orderBy: 'productName asc',
        pageSize: '25',
        skip: '0',
        searchQuery: '',
        locationId: 'l1',
        productName: 'Widget',
      });
      req.flush(body);
      expect(result.body).toEqual(body);
    });

    it('defaults locationId/productName to empty strings', () => {
      service.getInventories(makeParams()).subscribe();
      const req = expectUrl('GET', 'ProductStock');
      expectParams(req, { locationId: '', productName: '' });
      req.flush([]);
    });
  });

  describe('getInventoriesReport', () => {
    it('GETs ProductStock with pageSize 0 and skip 0', () => {
      service.getInventoriesReport(makeParams({ locationId: 'l1' })).subscribe();
      const req = expectUrl('GET', 'ProductStock');
      expectParams(req, { pageSize: '0', skip: '0', locationId: 'l1' });
      req.flush([]);
    });
  });

  describe('writes', () => {
    it('addInventory POSTs ProductStock with the body', () => {
      const inventory = { productId: 'p1', locationId: 'l1', stock: 5 } as any;
      let result: any;
      service.addInventory(inventory).subscribe((r) => (result = r));
      const req = expectUrl('POST', 'ProductStock');
      expect(req.request.body).toBe(inventory);
      req.flush(inventory);
      expect(result).toEqual(inventory);
    });

    it('bulkUpdateProductStock POSTs ProductStock/bulk-update with the command', () => {
      const command = { items: [{ productId: 'p1', stock: 3 }] };
      let result: any;
      service.bulkUpdateProductStock(command).subscribe((r) => (result = r));
      const req = expectUrl('POST', 'ProductStock/bulk-update');
      expect(req.request.body).toBe(command);
      req.flush({ success: true });
      expect(result).toEqual({ success: true });
    });

    it('bulkAdjustProductStock POSTs ProductStock/bulk-adjust with the command', () => {
      const command = { items: [{ productId: 'p1', adjustment: -2 }] };
      service.bulkAdjustProductStock(command).subscribe();
      const req = expectUrl('POST', 'ProductStock/bulk-adjust');
      expect(req.request.body).toBe(command);
      req.flush({});
    });
  });

  describe('histories + count', () => {
    it('getInventoryHistories GETs ProductStock/history with observe response', () => {
      const body = [{ id: 'h1' }];
      let result: any;
      service.getInventoryHistories(makeHistoryParams({ productId: 'p2', locationId: 'l2' })).subscribe((r) => (result = r));
      const req = expectUrl('GET', 'ProductStock/history');
      expectParams(req, {
        pageSize: '25',
        skip: '0',
        locationId: 'l2',
        productId: 'p2',
      });
      req.flush(body);
      expect(result.body).toEqual(body);
    });

    it('getInventoryByProductId GETs ProductStock/count with productId and locationId', () => {
      let result: any;
      service.getInventoryByProductId('p1', 'l1').subscribe((r) => (result = r));
      const req = expectUrl('GET', 'ProductStock/count');
      expectParams(req, { productId: 'p1', locationId: 'l1' });
      req.flush(7);
      expect(result).toBe(7);
    });
  });
});
