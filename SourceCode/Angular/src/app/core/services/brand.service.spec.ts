import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { BrandService } from './brand.service';
import { Brand } from '@core/domain-classes/brand';

describe('BrandService', () => {
  let service: BrandService;
  let httpMock: HttpTestingController;

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), BrandService],
    });
    service = TestBed.inject(BrandService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getAll GETs Brands', () => {
    const body: Brand[] = [{ id: 'b1', name: 'Acme' } as Brand];
    let result: Brand[] | undefined;
    service.getAll().subscribe((r) => (result = r));

    const req = expectUrl('GET', 'Brands');
    req.flush(body);
    expect(result).toEqual(body);
  });

  it('getById GETs Brand/{id}', () => {
    const body: Brand = { id: 'b1', name: 'Acme' } as Brand;
    let result: Brand | undefined;
    service.getById('b1').subscribe((r) => (result = r));

    expectUrl('GET', 'Brand/b1').flush(body);
    expect(result).toEqual(body);
  });

  it('delete DELETEs Brand/{id}', () => {
    service.delete('b1').subscribe();
    expectUrl('DELETE', 'Brand/b1').flush(null);
  });

  it('update PUTs Brand/{id} with the brand body', () => {
    const brand: Brand = { id: 'b1', name: 'Acme' } as Brand;
    service.update('b1', brand).subscribe();

    const req = expectUrl('PUT', 'Brand/b1');
    expect(req.request.body).toBe(brand);
    req.flush(brand);
  });

  it('add POSTs Brand with the brand body', () => {
    const brand: Brand = { name: 'Acme' } as Brand;
    let result: Brand | undefined;
    service.add(brand).subscribe((r) => (result = r));

    const req = expectUrl('POST', 'Brand');
    expect(req.request.body).toBe(brand);
    req.flush(brand);
    expect(result).toEqual(brand);
  });
});