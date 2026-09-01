import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';

import { NLogService } from './n-log.service';
import { NLogResource } from '@core/domain-classes/n-log-resource';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { CommonError } from '@core/error-handler/common-error';

describe('NLogService', () => {
  let service: NLogService;
  let httpMock: HttpTestingController;
  let errorHandler: jasmine.SpyObj<CommonHttpErrorService>;

  function makeResource(overrides: Partial<NLogResource> = {}): NLogResource {
    const p = new NLogResource();
    p.fields = '';
    p.orderBy = 'logged asc';
    p.pageSize = 25;
    p.skip = 0;
    p.searchQuery = '';
    Object.assign(p, overrides);
    return p;
  }

  beforeEach(() => {
    errorHandler = jasmine.createSpyObj<CommonHttpErrorService>('CommonHttpErrorService', ['handleError']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        NLogService,
        { provide: CommonHttpErrorService, useValue: errorHandler },
      ],
    });
    service = TestBed.inject(NLogService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getNLogs GETs NLog with observe response and PascalCase + lowercase params', () => {
    const body = [{ id: 'n1', level: 'Error' }];
    let result: any;
    service
      .getNLogs(makeResource({ level: 'Error', source: 'API', message: 'boom' }))
      .subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === 'NLog');
    expect(req.request.params.get('Fields')).toBe('');
    expect(req.request.params.get('OrderBy')).toBe('logged asc');
    expect(req.request.params.get('PageSize')).toBe('25');
    expect(req.request.params.get('Skip')).toBe('0');
    expect(req.request.params.get('SearchQuery')).toBe('');
    expect(req.request.params.get('level')).toBe('Error');
    expect(req.request.params.get('source')).toBe('API');
    expect(req.request.params.get('message')).toBe('boom');
    req.flush(body);
    expect(result.body).toEqual(body);
  });

  it('getNLogs defaults null level/source/message to empty strings', () => {
    service.getNLogs(makeResource({ level: null, source: null, message: null } as any)).subscribe();
    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === 'NLog');
    expect(req.request.params.get('level')).toBe('');
    expect(req.request.params.get('source')).toBe('');
    expect(req.request.params.get('message')).toBe('');
    req.flush([]);
  });

  it('getLogDetails GETs NLog/{id}', () => {
    let result: any;
    service.getLogDetails('n1').subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === 'NLog/n1');
    req.flush({ id: 'n1' });
    expect(result).toEqual({ id: 'n1' });
  });

  it('getLogDetails propagates CommonError through handleError', () => {
    errorHandler.handleError.and.callFake((err: HttpErrorResponse) =>
      throwError(() => ({ statusText: err.statusText, code: err.status } as CommonError))
    );
    let error: any;
    service.getLogDetails('n1').subscribe({ error: (e) => (error = e) });
    httpMock
      .expectOne((r) => r.method === 'GET' && r.url === 'NLog/n1')
      .flush({ messages: ['nope'] }, { status: 404, statusText: 'Not Found' });
    expect(error.code).toBe(404);
    expect(errorHandler.handleError).toHaveBeenCalled();
  });
});
