import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { DailyPriceService } from './daily-price.service';
import { DailyPriceList } from '@core/domain-classes/daily-price-list';
import { UpdateDailyPriceListCommand } from '@core/domain-classes/daily-price-update';

describe('DailyPriceService', () => {
  let service: DailyPriceService;
  let httpMock: HttpTestingController;

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), DailyPriceService],
    });
    service = TestBed.inject(DailyPriceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getDailyPriceList GETs DailyProductPrice/price-list with a Date-derived date and default groupBy', () => {
    const body = {} as DailyPriceList;
    let result: DailyPriceList | undefined;
    service.getDailyPriceList(new Date('2026-01-01T10:00:00Z')).subscribe((r) => (result = r));

    const req = expectUrl('GET', 'DailyProductPrice/price-list');
    expect(req.request.params.get('date')).toBe('2026-01-01');
    expect(req.request.params.get('groupBy')).toBe('Category');
    req.flush(body);
    expect(result).toBeTruthy();
  });

  it('getDailyPriceList keeps string dates as-is and honours groupBy', () => {
    service.getDailyPriceList('2026-01-02', 'Brand').subscribe();

    const req = expectUrl('GET', 'DailyProductPrice/price-list');
    expect(req.request.params.get('date')).toBe('2026-01-02');
    expect(req.request.params.get('groupBy')).toBe('Brand');
    req.flush({} as DailyPriceList);
  });

  it('getDailyPriceList omits the date param when not provided', () => {
    service.getDailyPriceList().subscribe();

    const req = expectUrl('GET', 'DailyProductPrice/price-list');
    expect(req.request.params.has('date')).toBe(false);
    expect(req.request.params.get('groupBy')).toBe('Category');
    req.flush({} as DailyPriceList);
  });

  it('updateDailyPriceList POSTs DailyProductPrice/bulk-update with the command', () => {
    const command: UpdateDailyPriceListCommand = {
      priceDate: '2026-01-01',
      prices: [{ productId: 'p1', salesPrice: 100, isActive: true }],
    };
    let result: any;
    service.updateDailyPriceList(command).subscribe((r) => (result = r));

    const req = expectUrl('POST', 'DailyProductPrice/bulk-update');
    expect(req.request.body).toBe(command);
    req.flush({ success: true });
    expect(result).toEqual({ success: true });
  });

  it('getEffectivePrice GETs DailyProductPrice/effective-price/{productId} with a date param', () => {
    const body = { productId: 'p1', effectivePrice: 10, date: '2026-01-01' };
    let result: any;
    service
      .getEffectivePrice('p1', new Date('2026-01-01T00:00:00Z'))
      .subscribe((r) => (result = r));

    const req = expectUrl('GET', 'DailyProductPrice/effective-price/p1');
    expect(req.request.params.get('date')).toBe('2026-01-01');
    req.flush(body);
    expect(result).toEqual(body);
  });

  it('getEffectivePrice keeps string dates and omits the date param when not provided', () => {
    service.getEffectivePrice('p1', '2026-01-02').subscribe();
    const req = expectUrl('GET', 'DailyProductPrice/effective-price/p1');
    expect(req.request.params.get('date')).toBe('2026-01-02');
    req.flush({} as any);
  });

  it('getEffectivePrice sends no date param when priceDate is not given', () => {
    service.getEffectivePrice('p1').subscribe();
    const req = expectUrl('GET', 'DailyProductPrice/effective-price/p1');
    expect(req.request.params.has('date')).toBe(false);
    req.flush({} as any);
  });
});