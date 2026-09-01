import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { CountryService } from './country.service';
import { Country } from '@core/domain-classes/country';

describe('CountryService', () => {
  let service: CountryService;
  let httpMock: HttpTestingController;

  const country: Country = { id: 'c1', countryName: 'Pakistan' };

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), CountryService],
    });
    service = TestBed.inject(CountryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getAll GETs Countries and emits the list', () => {
    let result: Country[] | undefined;
    service.getAll().subscribe((r) => (result = r));
    const req = expectUrl('GET', 'Countries');
    req.flush([country]);
    expect(result).toEqual([country]);
  });

  it('getById GETs country/{id}', () => {
    service.getById('c1').subscribe();
    const req = expectUrl('GET', 'country/c1');
    expect(req.request.method).toBe('GET');
    req.flush(country);
  });

  it('add POSTs Country with the body', () => {
    let result: Country | undefined;
    service.add(country).subscribe((r) => (result = r));
    const req = expectUrl('POST', 'Country');
    expect(req.request.body).toBe(country);
    req.flush(country);
    expect(result).toEqual(country);
  });

  it('update PUTs country/{id} with the body', () => {
    service.update('c1', country).subscribe();
    const req = expectUrl('PUT', 'country/c1');
    expect(req.request.body).toBe(country);
    req.flush(country);
  });

  it('delete DELETEs country/{id}', () => {
    service.delete('c1').subscribe();
    const req = expectUrl('DELETE', 'country/c1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
