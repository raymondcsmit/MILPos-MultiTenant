import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { VariantService } from './variants.service';
import { Variant } from '@core/domain-classes/variant';

describe('VariantService', () => {
  let service: VariantService;
  let httpMock: HttpTestingController;

  const variant: Variant = { id: 'v1', name: 'Color' } as Variant;

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), VariantService],
    });
    service = TestBed.inject(VariantService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getVariants GETs variant and emits the list', () => {
    let result: Variant[] | undefined;
    service.getVariants().subscribe((r) => (result = r));
    const req = expectUrl('GET', 'variant');
    req.flush([variant]);
    expect(result).toEqual([variant]);
  });

  it('getVariant GETs variant/{id}', () => {
    service.getVariant('v1').subscribe();
    const req = expectUrl('GET', 'variant/v1');
    expect(req.request.method).toBe('GET');
    req.flush(variant);
  });

  it('saveVariant POSTs variant with the body', () => {
    let result: Variant | undefined;
    service.saveVariant(variant).subscribe((r) => (result = r));
    const req = expectUrl('POST', 'variant');
    expect(req.request.body).toBe(variant);
    req.flush(variant);
    expect(result).toEqual(variant);
  });

  it('updateVariant PUTs variant/{id} with the body', () => {
    service.updateVariant('v1', variant).subscribe();
    const req = expectUrl('PUT', 'variant/v1');
    expect(req.request.body).toBe(variant);
    req.flush(variant);
  });

  it('deleteVariant DELETEs variant/{id}', () => {
    service.deleteVariant('v1').subscribe();
    const req = expectUrl('DELETE', 'variant/v1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
