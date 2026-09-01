import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { ExpenseCategoryService } from './expense-category.service';
import { ExpenseCategory } from '@core/domain-classes/expense-category';

describe('ExpenseCategoryService', () => {
  let service: ExpenseCategoryService;
  let httpMock: HttpTestingController;

  const category: ExpenseCategory = { id: 'e1', name: 'Travel' } as ExpenseCategory;

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ExpenseCategoryService],
    });
    service = TestBed.inject(ExpenseCategoryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getAll GETs ExpenseCategories and emits the list', () => {
    let result: ExpenseCategory[] | undefined;
    service.getAll().subscribe((r) => (result = r));
    const req = expectUrl('GET', 'ExpenseCategories');
    req.flush([category]);
    expect(result).toEqual([category]);
  });

  it('getById GETs ExpenseCategory/{id}', () => {
    service.getById('e1').subscribe();
    const req = expectUrl('GET', 'ExpenseCategory/e1');
    expect(req.request.method).toBe('GET');
    req.flush(category);
  });

  it('add POSTs ExpenseCategory with the body', () => {
    let result: ExpenseCategory | undefined;
    service.add(category).subscribe((r) => (result = r));
    const req = expectUrl('POST', 'ExpenseCategory');
    expect(req.request.body).toBe(category);
    req.flush(category);
    expect(result).toEqual(category);
  });

  it('update PUTs ExpenseCategory/{id} with the body', () => {
    service.update('e1', category).subscribe();
    const req = expectUrl('PUT', 'ExpenseCategory/e1');
    expect(req.request.body).toBe(category);
    req.flush(category);
  });

  it('delete DELETEs ExpenseCategory/{id}', () => {
    service.delete('e1').subscribe();
    const req = expectUrl('DELETE', 'ExpenseCategory/e1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
