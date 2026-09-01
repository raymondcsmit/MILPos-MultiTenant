import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { DamagedStockService } from './damaged-stock.service';
import { DamagedStockResourceParameter } from '@core/domain-classes/damaged-stock-resource-parameter';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';

describe('DamagedStockService', () => {
  let service: DamagedStockService;
  let httpMock: HttpTestingController;
  let errorHandler: jasmine.SpyObj<CommonHttpErrorService>;

  function makeParams(overrides: Partial<DamagedStockResourceParameter> = {}): DamagedStockResourceParameter {
    const p = new DamagedStockResourceParameter();
    p.fields = '';
    p.orderBy = 'damagedDate desc';
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
        DamagedStockService,
        { provide: CommonHttpErrorService, useValue: errorHandler },
      ],
    });
    service = TestBed.inject(DamagedStockService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('addDamagedStock', () => {
    it('POSTs DamagedStock with the body', () => {
      const damagedStock = { id: 'd1', productId: 'p1', quantity: 2 } as any;
      let result: any;
      service.addDamagedStock(damagedStock).subscribe((r) => (result = r));
      const req = expectUrl('POST', 'DamagedStock');
      expect(req.request.body).toBe(damagedStock);
      req.flush(damagedStock);
      expect(result).toEqual(damagedStock);
    });
  });

  describe('getDamagedStocks', () => {
    it('GETs DamagedStock with observe response and full params incl damagedDate', () => {
      const body = [{ id: 'd1' }];
      let result: any;
      service
        .getDamagedStocks(makeParams({ id: 'd1', locationId: 'l1', productId: 'p1', damagedDate: new Date('2026-01-15T00:00:00Z') }))
        .subscribe((r) => (result = r));
      const req = expectUrl('GET', 'DamagedStock');
      const params = req.request.params;
      expect(params.get('fields')).toBe('');
      expect(params.get('orderBy')).toBe('damagedDate desc');
      expect(params.get('pageSize')).toBe('25');
      expect(params.get('skip')).toBe('0');
      expect(params.get('searchQuery')).toBe('');
      expect(params.get('id')).toBe('d1');
      expect(params.get('locationId')).toBe('l1');
      expect(params.get('productId')).toBe('p1');
      expect(params.get('damagedDate')).toBe('2026-01-15T00:00:00.000Z');
      req.flush(body);
      expect(result.body).toEqual(body);
    });

    it('passes empty strings for unset id/location/product/date', () => {
      service.getDamagedStocks(makeParams()).subscribe();
      const req = expectUrl('GET', 'DamagedStock');
      const params = req.request.params;
      expect(params.get('id')).toBe('');
      expect(params.get('locationId')).toBe('');
      expect(params.get('productId')).toBe('');
      expect(params.get('damagedDate')).toBe('');
      req.flush([]);
    });
  });
});
