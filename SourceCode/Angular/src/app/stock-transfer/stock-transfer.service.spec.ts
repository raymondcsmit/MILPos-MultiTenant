import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { StockTransferService } from './stock-transfer.service';
import { StockTransferResourceParameter } from '@core/domain-classes/stockTransfer-resource-parameter';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';

describe('StockTransferService', () => {
  let service: StockTransferService;
  let httpMock: HttpTestingController;
  let errorHandler: jasmine.SpyObj<CommonHttpErrorService>;

  function makeParams(overrides: Partial<StockTransferResourceParameter> = {}): StockTransferResourceParameter {
    const p = new StockTransferResourceParameter();
    p.fields = '';
    p.orderBy = 'referenceNo asc';
    p.pageSize = 25;
    p.skip = 0;
    p.searchQuery = '';
    p.name = '';
    Object.assign(p, overrides);
    return p;
  }

  beforeEach(() => {
    errorHandler = jasmine.createSpyObj<CommonHttpErrorService>('CommonHttpErrorService', ['handleError']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        StockTransferService,
        { provide: CommonHttpErrorService, useValue: errorHandler },
      ],
    });
    service = TestBed.inject(StockTransferService);
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

  describe('getStockTransfers', () => {
    it('GETs stockTransfer with observe response and full params', () => {
      const body = [{ id: 't1' }];
      let result: any;
      service
        .getStockTransfers(makeParams({ referenceNo: 'ST-1', id: 't1', fromLocationId: 'l1', toLocationId: 'l2' }))
        .subscribe((r) => (result = r));
      const req = expectUrl('GET', 'stockTransfer');
      expectParams(req, {
        fields: '',
        orderBy: 'referenceNo asc',
        pageSize: '25',
        skip: '0',
        searchQuery: '',
        referenceNo: 'ST-1',
        id: 't1',
        fromLocationId: 'l1',
        toLocationId: 'l2',
      });
      req.flush(body);
      expect(result.body).toEqual(body);
    });

    it('passes empty referenceNo/id/locations when unset', () => {
      service.getStockTransfers(makeParams()).subscribe();
      const req = expectUrl('GET', 'stockTransfer');
      expectParams(req, { referenceNo: '', id: '', fromLocationId: '', toLocationId: '' });
      req.flush([]);
    });
  });

  describe('CRUD', () => {
    it('getStockTransfer GETs stockTransfer/{id}', () => {
      const transfer = { id: 't1', referenceNo: 'ST-1' } as any;
      let result: any;
      service.getStockTransfer('t1').subscribe((r) => (result = r));
      const req = expectUrl('GET', 'stockTransfer/t1');
      req.flush(transfer);
      expect(result).toEqual(transfer);
    });

    it('addStockTransfer POSTs stockTransfer with the body', () => {
      const transfer = { id: 't1', referenceNo: 'ST-1' } as any;
      let result: any;
      service.addStockTransfer(transfer).subscribe((r) => (result = r));
      const req = expectUrl('POST', 'stockTransfer');
      expect(req.request.body).toBe(transfer);
      req.flush(transfer);
      expect(result).toEqual(transfer);
    });

    it('updateStockTransfer PUTs stockTransfer/{id} with the body', () => {
      const transfer = { id: 't1', referenceNo: 'ST-1' } as any;
      service.updateStockTransfer('t1', transfer).subscribe();
      const req = expectUrl('PUT', 'stockTransfer/t1');
      expect(req.request.body).toBe(transfer);
      req.flush(transfer);
    });

    it('deleteStockTransfer DELETEs stockTransfer/{id}', () => {
      service.deleteStockTransfer('t1').subscribe();
      const req = expectUrl('DELETE', 'stockTransfer/t1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });
});
