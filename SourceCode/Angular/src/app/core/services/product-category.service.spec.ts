import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { ProductCategoryService } from './product-category.service';
import { ProductCategory } from '@core/domain-classes/product-category';

describe('ProductCategoryService', () => {
  let service: ProductCategoryService;
  let httpMock: HttpTestingController;

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ProductCategoryService],
    });
    service = TestBed.inject(ProductCategoryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getAll(true) GETs ProductCategories with isDropDown=true', () => {
    const body: ProductCategory[] = [{ id: 'c1', name: 'Food' } as ProductCategory];
    let result: ProductCategory[] | undefined;
    service.getAll(true).subscribe((r) => (result = r));

    const req = expectUrl('GET', 'ProductCategories');
    expect(req.request.params.get('isDropDown')).toBe('true');
    req.flush(body);
    expect(result).toEqual(body);
  });

  it('getAll(false) GETs ProductCategories with isDropDown=false', () => {
    service.getAll(false).subscribe();
    const req = expectUrl('GET', 'ProductCategories');
    expect(req.request.params.get('isDropDown')).toBe('false');
    req.flush([]);
  });

  it('getAllSubCategories GETs ProductCategories/{parentId}/subcategories', () => {
    const body: ProductCategory[] = [{ id: 'c2', name: 'Beverages' } as ProductCategory];
    let result: ProductCategory[] | undefined;
    service.getAllSubCategories('c1').subscribe((r) => (result = r));

    expectUrl('GET', 'ProductCategories/c1/subcategories').flush(body);
    expect(result).toEqual(body);
  });

  it('getById GETs ProductCategory/{id}', () => {
    const body: ProductCategory = { id: 'c1', name: 'Food' } as ProductCategory;
    let result: ProductCategory | undefined;
    service.getById('c1').subscribe((r) => (result = r));

    expectUrl('GET', 'ProductCategory/c1').flush(body);
    expect(result).toEqual(body);
  });

  it('delete DELETEs ProductCategory/{id}', () => {
    service.delete('c1').subscribe();
    expectUrl('DELETE', 'ProductCategory/c1').flush(null);
  });

  it('update PUTs ProductCategory/{id} with the category body', () => {
    const category: ProductCategory = { id: 'c1', name: 'Food' } as ProductCategory;
    service.update('c1', category).subscribe();

    const req = expectUrl('PUT', 'ProductCategory/c1');
    expect(req.request.body).toBe(category);
    req.flush(category);
  });

  it('add POSTs ProductCategory with the category body', () => {
    const category: ProductCategory = { name: 'Food' } as ProductCategory;
    let result: ProductCategory | undefined;
    service.add(category).subscribe((r) => (result = r));

    const req = expectUrl('POST', 'ProductCategory');
    expect(req.request.body).toBe(category);
    req.flush(category);
    expect(result).toEqual(category);
  });
});