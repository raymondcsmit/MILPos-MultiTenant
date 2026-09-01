import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { ProductService } from './product.service';
import { ProductResourceParameter, ProductType } from '@core/domain-classes/product-resource-parameter';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';

describe('ProductService', () => {
  let service: ProductService;
  let httpMock: HttpTestingController;
  let errorHandler: jasmine.SpyObj<CommonHttpErrorService>;

  function makeParams(overrides: Partial<ProductResourceParameter> = {}): ProductResourceParameter {
    const p = new ProductResourceParameter();
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
    errorHandler = jasmine.createSpyObj<CommonHttpErrorService>('CommonHttpErrorService', ['handleError']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ProductService,
        { provide: CommonHttpErrorService, useValue: errorHandler },
      ],
    });
    service = TestBed.inject(ProductService);
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

  describe('getProductsDropdown', () => {
    it('GETs product/dropdowns with full params', () => {
      const p = makeParams({ categoryId: 'c1', unitId: 'u1', barcode: 'bc1', brandId: 'b1', id: 'p1' });
      let result: any;
      const body = [{ id: 'p1' }];
      service.getProductsDropdown(p).subscribe((r) => (result = r));
      const req = expectUrl('GET', 'product/dropdowns');
      expectParams(req, {
        fields: '',
        orderBy: 'name asc',
        pageSize: '25',
        skip: '0',
        searchQuery: '',
        name: '',
        id: 'p1',
        categoryId: 'c1',
        unitId: 'u1',
        barcode: 'bc1',
        brandId: 'b1',
        productType: '',
        parentId: '',
        isBarcodeGenerated: 'false',
      });
      req.flush(body);
      expect(result).toEqual(body);
    });

    it('forces pageSize 0 when parentId is set', () => {
      service.getProductsDropdown(makeParams({ parentId: 'parent1' })).subscribe();
      const req = expectUrl('GET', 'product/dropdowns');
      expect(req.request.params.get('pageSize')).toBe('0');
      expect(req.request.params.get('parentId')).toBe('parent1');
      req.flush([]);
    });

    it('defaults orderBy to name asc when unset', () => {
      const p = makeParams();
      p.orderBy = '';
      service.getProductsDropdown(p).subscribe();
      const req = expectUrl('GET', 'product/dropdowns');
      expect(req.request.params.get('orderBy')).toBe('name asc');
      req.flush([]);
    });
  });

  describe('getProducts', () => {
    it('GETs product with observe response', () => {
      const body = [{ id: 'p1' }];
      let result: any;
      service.getProducts(makeParams({ productType: ProductType.MainProduct })).subscribe((r) => (result = r));
      const req = expectUrl('GET', 'product');
      expectParams(req, {
        pageSize: '25',
        skip: '0',
        productType: '1',
        isBarcodeGenerated: 'false',
      });
      req.flush(body);
      expect(result.body).toEqual(body);
    });

    it('passes isBarcodeGenerated true through', () => {
      service.getProducts(makeParams({ isBarcodeGenerated: true })).subscribe();
      const req = expectUrl('GET', 'product');
      expect(req.request.params.get('isBarcodeGenerated')).toBe('true');
      req.flush([]);
    });
  });

  describe('CRUD', () => {
    it('getProudct GETs product/{id}', () => {
      const product = { id: 'p1', name: 'Product A' } as any;
      let result: any;
      service.getProudct('p1').subscribe((r) => (result = r));
      const req = expectUrl('GET', 'product/p1');
      req.flush(product);
      expect(result).toEqual(product);
    });

    it('addProudct POSTs product with the body', () => {
      const product = { id: 'p1', name: 'Product A' } as any;
      let result: any;
      service.addProudct(product).subscribe((r) => (result = r));
      const req = expectUrl('POST', 'product');
      expect(req.request.body).toBe(product);
      req.flush(product);
      expect(result).toEqual(product);
    });

    it('updateProudct PUTs product/{id} with the body', () => {
      const product = { id: 'p1', name: 'Product A' } as any;
      service.updateProudct('p1', product).subscribe();
      const req = expectUrl('PUT', 'product/p1');
      expect(req.request.body).toBe(product);
      req.flush(product);
    });

    it('deleteProudct DELETEs product/{id}', () => {
      service.deleteProudct('p1').subscribe();
      const req = expectUrl('DELETE', 'product/p1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('getProductsInventory', () => {
    it('POSTs ProductStock/check with locationId and productIds', () => {
      const productIds = [{ id: 'p1', unitName: 'pcs' }] as any;
      const body = [{ id: 'p1', currentStock: 5 }] as any;
      let result: any;
      service.getProductsInventory('l1', productIds).subscribe((r) => (result = r));
      const req = expectUrl('POST', 'ProductStock/check');
      expect(req.request.body).toEqual({ locationId: 'l1', productIds });
      req.flush(body);
      expect(result).toEqual(body);
    });
  });
});
