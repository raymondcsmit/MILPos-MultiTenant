import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { ExpenseService } from './expense.service';
import { ExpenseResourceParameter } from '@core/domain-classes/expense-source-parameter';
import { Expense } from '@core/domain-classes/expense';
import { TaxItem } from '@core/domain-classes/purchase-sales-order-tax-item';

describe('ExpenseService', () => {
  let service: ExpenseService;
  let httpMock: HttpTestingController;

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  function makeParams(overrides: Partial<ExpenseResourceParameter> = {}): ExpenseResourceParameter {
    const p = new ExpenseResourceParameter();
    p.fields = '';
    p.orderBy = 'expenseDate desc';
    p.pageSize = 25;
    p.skip = 0;
    p.searchQuery = '';
    p.name = '';
    p.description = '';
    p.expenseCategoryId = '';
    p.reference = '';
    p.expenseById = '';
    p.locationId = '';
    Object.assign(p, overrides);
    return p;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ExpenseService],
    });
    service = TestBed.inject(ExpenseService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getExpenses', () => {
    it('GETs expense with observe response and full params incl ISO dates', () => {
      const body: Expense[] = [{ id: 'e1' } as Expense];
      let result: HttpResponse<Expense[]> | undefined;
      service
        .getExpenses(
          makeParams({
            expenseCategoryId: 'cat1',
            expenseById: 'u1',
            reference: 'REF-1',
            description: 'fuel',
            locationId: 'l1',
            fromDate: new Date('2026-01-01T00:00:00Z'),
            toDate: new Date('2026-01-31T00:00:00Z'),
          })
        )
        .subscribe((r) => (result = r));

      const req = expectUrl('GET', 'expense');
      const params = req.request.params;
      expect(params.get('fields')).toBe('');
      expect(params.get('orderBy')).toBe('expenseDate desc');
      expect(params.get('pageSize')).toBe('25');
      expect(params.get('skip')).toBe('0');
      expect(params.get('searchQuery')).toBe('');
      expect(params.get('description')).toBe('fuel');
      expect(params.get('expenseCategoryId')).toBe('cat1');
      expect(params.get('reference')).toBe('REF-1');
      expect(params.get('expenseById')).toBe('u1');
      expect(params.get('fromDate')).toBe('2026-01-01T00:00:00.000Z');
      expect(params.get('toDate')).toBe('2026-01-31T00:00:00.000Z');
      expect(params.get('locationId')).toBe('l1');
      req.flush(body);
      expect(result).toBeInstanceOf(HttpResponse);
      expect(result!.body).toEqual(body);
    });

    it('passes empty strings for unset optionals', () => {
      service.getExpenses(makeParams()).subscribe();
      const req = expectUrl('GET', 'expense');
      const params = req.request.params;
      expect(params.get('description')).toBe('');
      expect(params.get('expenseCategoryId')).toBe('');
      expect(params.get('reference')).toBe('');
      expect(params.get('expenseById')).toBe('');
      expect(params.get('fromDate')).toBe('');
      expect(params.get('toDate')).toBe('');
      expect(params.get('locationId')).toBe('');
      req.flush([]);
    });
  });

  it('getExpensesReport GETs expense with pageSize 0 and skip 0', () => {
    service
      .getExpensesReport(makeParams({ pageSize: 25, skip: 50, expenseCategoryId: 'cat1' }))
      .subscribe();
    const req = expectUrl('GET', 'expense');
    expect(req.request.params.get('pageSize')).toBe('0');
    expect(req.request.params.get('skip')).toBe('0');
    expect(req.request.params.get('expenseCategoryId')).toBe('cat1');
    req.flush([]);
  });

  it('getExpense GETs expense/{id} and returns the expense', () => {
    const body: Expense = { id: 'e1', reference: 'EXP-1' } as Expense;
    let result: Expense | undefined;
    service.getExpense('e1').subscribe((r) => (result = r));

    expectUrl('GET', 'expense/e1').flush(body);
    expect(result).toEqual(body);
  });

  it('deleteExpense DELETEs expense/{id}', () => {
    service.deleteExpense('e1').subscribe();
    const req = expectUrl('DELETE', 'expense/e1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('updateExpense PUTs expense/{id} with the expense body', () => {
    const expense: Expense = { id: 'e1', reference: 'EXP-1' } as Expense;
    let result: Expense | undefined;
    service.updateExpense('e1', expense).subscribe((r) => (result = r));

    const req = expectUrl('PUT', 'expense/e1');
    expect(req.request.body).toBe(expense);
    req.flush(expense);
    expect(result).toEqual(expense);
  });

  it('addExpense POSTs expense with the expense body', () => {
    const expense: Expense = { id: 'e2', reference: 'EXP-2' } as Expense;
    let result: Expense | undefined;
    service.addExpense(expense).subscribe((r) => (result = r));

    const req = expectUrl('POST', 'expense');
    expect(req.request.body).toBe(expense);
    req.flush(expense);
    expect(result).toEqual(expense);
  });

  it('downloadReceipt GETs expense/{id}/download as blob events', () => {
    let result: any;
    service.downloadReceipt('e1').subscribe((r) => (result = r));

    const req = expectUrl('GET', 'expense/e1/download');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['receipt']));
    expect(result).toBeInstanceOf(HttpResponse);
    expect(result!.body).toBeInstanceOf(Blob);
  });

  it('getExpenseTaxItems GETs expense/{id}/tax-item', () => {
    const body: TaxItem[] = [{ taxId: 't1', name: 'GST', totalAmount: 10 } as TaxItem];
    let result: TaxItem[] | undefined;
    service.getExpenseTaxItems('e1').subscribe((r) => (result = r));

    expectUrl('GET', 'expense/e1/tax-item').flush(body);
    expect(result).toEqual(body);
  });

  it('getTotalByTaxForExpense GETs expense/tax-total with params', () => {
    service
      .getTotalByTaxForExpense(makeParams({ locationId: 'l1', expenseById: 'u1' }))
      .subscribe();
    const req = expectUrl('GET', 'expense/tax-total');
    expect(req.request.params.get('locationId')).toBe('l1');
    expect(req.request.params.get('expenseById')).toBe('u1');
    expect(req.request.params.get('pageSize')).toBe('25');
    req.flush([]);
  });

  it('surfaces HTTP errors as HttpErrorResponse when not handled', () => {
    let error: any;
    service.getExpense('e1').subscribe({ error: (e) => (error = e) });
    expectUrl('GET', 'expense/e1').flush({}, { status: 500, statusText: 'boom' });
    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect(error.status).toBe(500);
  });
});
