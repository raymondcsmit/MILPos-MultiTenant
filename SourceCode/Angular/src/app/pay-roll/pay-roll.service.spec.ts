import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { HttpEventType } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';

import { PayRollService } from './pay-roll.service';
import { PayRollResourceParameter } from './pay-roll-list/pay-roll-resource-parameter';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { CommonError } from '@core/error-handler/common-error';

describe('PayRollService', () => {
  let service: PayRollService;
  let httpMock: HttpTestingController;
  let errorHandler: jasmine.SpyObj<CommonHttpErrorService>;

  function makeParams(overrides: Partial<PayRollResourceParameter> = {}): PayRollResourceParameter {
    const p = new PayRollResourceParameter();
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
        PayRollService,
        { provide: CommonHttpErrorService, useValue: errorHandler },
      ],
    });
    service = TestBed.inject(PayRollService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getAllPayRoll GETs PayRoll with observe response and full params incl ISO dates', () => {
    const body = [{ id: 'pr1' }];
    let result: any;
    service
      .getAllPayRoll(
        makeParams({
          employeeId: 'e1',
          branchId: 'b1',
          salaryMonth: 'Jan',
          paymentMode: 'Cash',
          fromDate: new Date('2026-01-01T00:00:00Z'),
          toDate: new Date('2026-01-31T00:00:00Z'),
        })
      )
      .subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === 'PayRoll');
    expect(req.request.params.get('employeeId')).toBe('e1');
    expect(req.request.params.get('branchId')).toBe('b1');
    expect(req.request.params.get('salaryMonth')).toBe('Jan');
    expect(req.request.params.get('paymentMode')).toBe('Cash');
    expect(req.request.params.get('fromDate')).toBe('2026-01-01T00:00:00.000Z');
    expect(req.request.params.get('toDate')).toBe('2026-01-31T00:00:00.000Z');
    expect(req.request.params.get('pageSize')).toBe('25');
    req.flush(body);
    expect(result.body).toEqual(body);
  });

  it('getAllPayRoll defaults null optionals to empty strings', () => {
    service
      .getAllPayRoll(makeParams({ employeeId: null, branchId: null, salaryMonth: null, paymentMode: null, fromDate: null, toDate: null } as any))
      .subscribe();
    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === 'PayRoll');
    expect(req.request.params.get('employeeId')).toBe('');
    expect(req.request.params.get('branchId')).toBe('');
    expect(req.request.params.get('salaryMonth')).toBe('');
    expect(req.request.params.get('paymentMode')).toBe('');
    expect(req.request.params.get('fromDate')).toBe('');
    expect(req.request.params.get('toDate')).toBe('');
    req.flush([]);
  });

  it('addPayRoll POSTs PayRoll with the FormData body', () => {
    const formData = new FormData();
    formData.append('name', 'pr');
    let result: any;
    service.addPayRoll(formData).subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.method === 'POST' && r.url === 'PayRoll');
    expect(req.request.body).toBe(formData);
    req.flush({ id: 'pr1' });
    expect(result).toEqual({ id: 'pr1' });
  });

  it('addPayRoll propagates CommonError through handleError', () => {
    errorHandler.handleError.and.callFake((err: HttpErrorResponse) =>
      throwError(() => ({ statusText: err.statusText, code: err.status } as CommonError))
    );
    let error: any;
    service.addPayRoll(new FormData()).subscribe({ error: (e) => (error = e) });
    httpMock
      .expectOne((r) => r.method === 'POST' && r.url === 'PayRoll')
      .flush({ messages: ['nope'] }, { status: 422, statusText: 'Unprocessable Entity' });
    expect(error.code).toBe(422);
    expect(errorHandler.handleError).toHaveBeenCalled();
  });

  it('getEmployeesForDropDown GETs PayRoll/employeeSearch with query-string params', () => {
    let result: any;
    service.getEmployeesForDropDown('  ali  ', 'e1').subscribe((r) => (result = r));
    const req = httpMock.expectOne('PayRoll/employeeSearch?searchQuery=ali&pageSize=10&id=e1');
    expect(req.request.method).toBe('GET');
    req.flush([]);
    expect(result).toEqual([]);
  });

  it('getEmployeesForDropDown trims empty search and empty id', () => {
    service.getEmployeesForDropDown('   ').subscribe();
    const req = httpMock.expectOne('PayRoll/employeeSearch?searchQuery=&pageSize=10&id=');
    req.flush([]);
  });

  it('downloadAttachment GETs PayRoll/download/{fileName} as a blob with progress events', () => {
    const events: any[] = [];
    service.downloadAttachment('payslip.pdf').subscribe((e) => events.push(e));
    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === 'PayRoll/download/payslip.pdf');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['pdf']));
    expect(events.some((e) => e.type === HttpEventType.Response)).toBe(true);
  });
});
