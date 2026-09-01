import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';

import { FinancialYearService } from './financial-year.service';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { CommonError } from '@core/error-handler/common-error';

describe('FinancialYearService', () => {
  let service: FinancialYearService;
  let httpMock: HttpTestingController;
  let errorHandler: jasmine.SpyObj<CommonHttpErrorService>;

  beforeEach(() => {
    errorHandler = jasmine.createSpyObj<CommonHttpErrorService>('CommonHttpErrorService', ['handleError']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        FinancialYearService,
        { provide: CommonHttpErrorService, useValue: errorHandler },
      ],
    });
    service = TestBed.inject(FinancialYearService);
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

  it('getAllFinancialYear GETs FinancialYear', () => {
    const body = [{ id: 'fy1', name: 'FY2026' }];
    let result: any;
    service.getAllFinancialYear().subscribe((r) => (result = r));
    const req = expectUrl('GET', 'FinancialYear');
    expect(req.request.method).toBe('GET');
    req.flush(body);
    expect(result).toEqual(body);
  });

  it('getFinancialYear GETs FinancialYear/{id}', () => {
    const fy = { id: 'fy1', name: 'FY2026' } as any;
    let result: any;
    service.getFinancialYear('fy1').subscribe((r) => (result = r));
    const req = expectUrl('GET', 'FinancialYear/fy1');
    expect(req.request.method).toBe('GET');
    req.flush(fy);
    expect(result).toEqual(fy);
  });

  it('addFinancialYear POSTs FinancialYear with the body', () => {
    const fy = { id: 'fy1', name: 'FY2026' } as any;
    let result: any;
    service.addFinancialYear(fy).subscribe((r) => (result = r));
    const req = expectUrl('POST', 'FinancialYear');
    expect(req.request.body).toBe(fy);
    req.flush(fy);
    expect(result).toEqual(fy);
  });

  it('updateFinancialYear PUTs FinancialYear/{id} with the body', () => {
    const fy = { id: 'fy1', name: 'FY2026' } as any;
    service.updateFinancialYear('fy1', fy).subscribe();
    const req = expectUrl('PUT', 'FinancialYear/fy1');
    expect(req.request.body).toBe(fy);
    req.flush(fy);
  });

  it('deleteFinancialYear DELETEs FinancialYear/{id}', () => {
    service.deleteFinancialYear('fy1').subscribe();
    const req = expectUrl('DELETE', 'FinancialYear/fy1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('propagates CommonError from addFinancialYear', () => {
    errorHandler.handleError.and.callFake((err: HttpErrorResponse) =>
      throwError(() => ({ statusText: err.statusText, code: err.status } as CommonError))
    );
    let error: any;
    service.addFinancialYear({ id: 'fy1' } as any).subscribe({ error: (e) => (error = e) });
    expectUrl('POST', 'FinancialYear').flush({ messages: ['nope'] }, { status: 422, statusText: 'Unprocessable Entity' });
    expect(error.code).toBe(422);
    expect(errorHandler.handleError).toHaveBeenCalled();
  });
});
