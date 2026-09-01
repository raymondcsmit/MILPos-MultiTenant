import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';

import { BusinessLocationService } from './business-location.service';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { CommonError } from '@core/error-handler/common-error';

describe('BusinessLocationService', () => {
  let service: BusinessLocationService;
  let httpMock: HttpTestingController;
  let errorHandler: jasmine.SpyObj<CommonHttpErrorService>;

  beforeEach(() => {
    errorHandler = jasmine.createSpyObj<CommonHttpErrorService>('CommonHttpErrorService', ['handleError']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        BusinessLocationService,
        { provide: CommonHttpErrorService, useValue: errorHandler },
      ],
    });
    service = TestBed.inject(BusinessLocationService);
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

  it('getLocations GETs location', () => {
    const body = [{ id: 'l1', name: 'Main Branch' }];
    let result: any;
    service.getLocations().subscribe((r) => (result = r));
    const req = expectUrl('GET', 'location');
    expect(req.request.method).toBe('GET');
    req.flush(body);
    expect(result).toEqual(body);
  });

  it('createLocation POSTs location with the body', () => {
    const location = { id: 'l1', name: 'Main Branch' } as any;
    let result: any;
    service.createLocation(location).subscribe((r) => (result = r));
    const req = expectUrl('POST', 'location');
    expect(req.request.body).toBe(location);
    req.flush(location);
    expect(result).toEqual(location);
  });

  it('updateLocation PUTs location/{id} with the body', () => {
    const location = { id: 'l1', name: 'Main Branch' } as any;
    service.updateLocation('l1', location).subscribe();
    const req = expectUrl('PUT', 'location/l1');
    expect(req.request.body).toBe(location);
    req.flush(location);
  });

  it('deleteLocation DELETEs location/{id}', () => {
    service.deleteLocation('l1').subscribe();
    const req = expectUrl('DELETE', 'location/l1');
    expect(req.request.method).toBe('DELETE');
    req.flush(true);
  });

  it('propagates CommonError from createLocation', () => {
    errorHandler.handleError.and.callFake((err: HttpErrorResponse) =>
      throwError(() => ({ statusText: err.statusText, code: err.status } as CommonError))
    );
    let error: any;
    service.createLocation({ id: 'l1' } as any).subscribe({ error: (e) => (error = e) });
    expectUrl('POST', 'location').flush({ messages: ['nope'] }, { status: 422, statusText: 'Unprocessable Entity' });
    expect(error.code).toBe(422);
    expect(errorHandler.handleError).toHaveBeenCalled();
  });
});
