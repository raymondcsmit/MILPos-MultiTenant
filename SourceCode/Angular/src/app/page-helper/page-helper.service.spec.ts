import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';

import { PageHelperService } from './page-helper.service';
import { PageHelper } from '@core/domain-classes/page-helper';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { CommonError } from '@core/error-handler/common-error';

describe('PageHelperService', () => {
  let service: PageHelperService;
  let httpMock: HttpTestingController;
  let errorHandler: jasmine.SpyObj<CommonHttpErrorService>;

  const helper: PageHelper = { id: 'ph1', name: 'Sales' } as PageHelper;

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  beforeEach(() => {
    errorHandler = jasmine.createSpyObj<CommonHttpErrorService>('CommonHttpErrorService', ['handleError']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PageHelperService,
        { provide: CommonHttpErrorService, useValue: errorHandler },
      ],
    });
    service = TestBed.inject(PageHelperService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getPageHelpers GETs pagehelper and emits the list', () => {
    let result: PageHelper[] | undefined;
    service.getPageHelpers().subscribe((r) => (result = r));
    const req = expectUrl('GET', 'pagehelper');
    req.flush([helper]);
    expect(result).toEqual([helper]);
  });

  it('updatePageHelper POSTs pagehelper/{id} with the body', () => {
    let result: any;
    service.updatePageHelper(helper).subscribe((r) => (result = r));
    const req = expectUrl('POST', 'pagehelper/ph1');
    expect(req.request.body).toBe(helper);
    req.flush(helper);
    expect(result).toEqual(helper);
  });

  it('getPageHelper GETs pagehelper/{id}', () => {
    let result: any;
    service.getPageHelper('ph1').subscribe((r) => (result = r));
    const req = expectUrl('GET', 'pagehelper/ph1');
    req.flush(helper);
    expect(result).toEqual(helper);
  });

  it('getPageHelper propagates CommonError through handleError', () => {
    errorHandler.handleError.and.callFake((err: HttpErrorResponse) =>
      throwError(() => ({ statusText: err.statusText, code: err.status } as CommonError))
    );
    let error: any;
    service.getPageHelper('ph1').subscribe({ error: (e) => (error = e) });
    expectUrl('GET', 'pagehelper/ph1').flush(
      { messages: ['nope'] },
      { status: 404, statusText: 'Not Found' }
    );
    expect(error.code).toBe(404);
    expect(errorHandler.handleError).toHaveBeenCalled();
  });
});
