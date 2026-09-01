import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { CityService } from './city.service';
import { CityResourceParameter } from '@core/domain-classes/city-resource-parameter';

describe('CityService', () => {
  let service: CityService;
  let httpMock: HttpTestingController;

  function makeParams(overrides: Partial<CityResourceParameter> = {}): CityResourceParameter {
    const p = new CityResourceParameter();
    p.fields = '';
    p.orderBy = 'name asc';
    p.pageSize = 25;
    p.skip = 0;
    p.searchQuery = '';
    p.name = '';
    Object.assign(p, overrides);
    return p;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), CityService],
    });
    service = TestBed.inject(CityService);
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

  describe('getCities', () => {
    it('GETs city with observe response and full params', () => {
      const body = [{ id: 'ct1' }];
      let result: any;
      service.getCities(makeParams({ cityName: 'Lahore', countryName: 'Pakistan' })).subscribe((r) => (result = r));
      const req = expectUrl('GET', 'city');
      const params = req.request.params;
      expect(params.get('fields')).toBe('');
      expect(params.get('orderBy')).toBe('name asc');
      expect(params.get('pageSize')).toBe('25');
      expect(params.get('skip')).toBe('0');
      expect(params.get('searchQuery')).toBe('');
      expect(params.get('cityName')).toBe('Lahore');
      expect(params.get('countryName')).toBe('Pakistan');
      req.flush(body);
      expect(result.body).toEqual(body);
    });

    it('passes empty countryName when unset', () => {
      service.getCities(makeParams()).subscribe();
      const req = expectUrl('GET', 'city');
      expect(req.request.params.get('countryName')).toBe('');
      req.flush([]);
    });
  });

  describe('CRUD', () => {
    it('getCity GETs city/{id}', () => {
      const city = { id: 'ct1', name: 'Lahore' } as any;
      let result: any;
      service.getCity('ct1').subscribe((r) => (result = r));
      const req = expectUrl('GET', 'city/ct1');
      expect(req.request.method).toBe('GET');
      req.flush(city);
      expect(result).toEqual(city);
    });

    it('saveCity POSTs city with the body', () => {
      const city = { id: 'ct1', name: 'Lahore' } as any;
      let result: any;
      service.saveCity(city).subscribe((r) => (result = r));
      const req = expectUrl('POST', 'city');
      expect(req.request.body).toBe(city);
      req.flush(city);
      expect(result).toEqual(city);
    });

    it('updateCity PUTs city/{id} with the body', () => {
      const city = { id: 'ct1', name: 'Lahore' } as any;
      service.updateCity('ct1', city).subscribe();
      const req = expectUrl('PUT', 'city/ct1');
      expect(req.request.body).toBe(city);
      req.flush(city);
    });

    it('deleteCity DELETEs city/{id}', () => {
      service.deleteCity('ct1').subscribe();
      const req = expectUrl('DELETE', 'city/ct1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });
});
