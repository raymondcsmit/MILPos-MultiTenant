import { TestBed } from '@angular/core/testing';
import { HttpEvent, HttpHandlerFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { loadingInterceptor } from './loading.interceptor';
import { LoadingService } from './loading.service';

describe('loadingInterceptor', () => {
  let loadingSpy: jasmine.SpyObj<LoadingService>;

  beforeEach(() => {
    loadingSpy = jasmine.createSpyObj('LoadingService', ['show', 'hide']);
    TestBed.configureTestingModule({
      providers: [{ provide: LoadingService, useValue: loadingSpy }]
    });
  });

  it('shows loader, forwards request and hides loader on success', (done) => {
    const req = new HttpRequest('GET', '/api/test');
    const next = jasmine.createSpy('next').and.returnValue(of(new HttpResponse())) as unknown as HttpHandlerFn;

    TestBed.runInInjectionContext(() => loadingInterceptor(req, next)).subscribe({
      next: (event) => {
        expect(event instanceof HttpResponse).toBeTrue();
        expect(next).toHaveBeenCalledWith(req);
        expect(loadingSpy.show).toHaveBeenCalledTimes(1);
      },
      complete: () => setTimeout(() => {
        expect(loadingSpy.hide).toHaveBeenCalledTimes(1);
        done();
      }, 0)
    });
  });

  it('hides loader when the request errors', (done) => {
    const req = new HttpRequest('GET', '/api/test');
    const next = jasmine.createSpy('next')
      .and.returnValue(throwError(() => new Error('boom'))) as unknown as HttpHandlerFn;

    TestBed.runInInjectionContext(() => loadingInterceptor(req, next)).subscribe({
      error: () => setTimeout(() => {
        expect(loadingSpy.show).toHaveBeenCalledTimes(1);
        expect(loadingSpy.hide).toHaveBeenCalledTimes(1);
        done();
      }, 0)
    });
  });
});
