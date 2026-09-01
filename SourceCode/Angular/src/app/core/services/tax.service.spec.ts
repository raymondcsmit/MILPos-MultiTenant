import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { TaxService } from './tax.service';
import { Tax } from '@core/domain-classes/tax';

describe('TaxService', () => {
  let service: TaxService;
  let httpMock: HttpTestingController;

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), TaxService],
    });
    service = TestBed.inject(TaxService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getAll GETs Tax', () => {
    const body: Tax[] = [{ id: 't1', name: 'GST 17%' } as Tax];
    let result: Tax[] | undefined;
    service.getAll().subscribe((r) => (result = r));

    const req = expectUrl('GET', 'Tax');
    req.flush(body);
    expect(result).toEqual(body);
  });

  it('getById GETs Tax/{id}', () => {
    const body: Tax = { id: 't1', name: 'GST 17%' } as Tax;
    let result: Tax | undefined;
    service.getById('t1').subscribe((r) => (result = r));

    expectUrl('GET', 'Tax/t1').flush(body);
    expect(result).toEqual(body);
  });

  it('delete DELETEs Tax/{id}', () => {
    service.delete('t1').subscribe();
    expectUrl('DELETE', 'Tax/t1').flush(null);
  });

  it('update PUTs Tax/{id} with the tax body', () => {
    const tax: Tax = { id: 't1', name: 'GST 17%' } as Tax;
    service.update('t1', tax).subscribe();

    const req = expectUrl('PUT', 'Tax/t1');
    expect(req.request.body).toBe(tax);
    req.flush(tax);
  });

  it('add POSTs Tax with the tax body', () => {
    const tax: Tax = { name: 'GST 17%' } as Tax;
    let result: Tax | undefined;
    service.add(tax).subscribe((r) => (result = r));

    const req = expectUrl('POST', 'Tax');
    expect(req.request.body).toBe(tax);
    req.flush(tax);
    expect(result).toEqual(tax);
  });
});