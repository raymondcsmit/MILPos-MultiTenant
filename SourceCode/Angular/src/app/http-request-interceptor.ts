import { EnvironmentInjector, inject, runInInjectionContext } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import {
  HttpEvent,
  HttpRequest,
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
} from '@angular/common/http';
import { environment } from '@environments/environment';
import { catchError, finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { WrLicenseService } from '@core/services/wr-license.service';
import { LoadingProgressService } from '@shared/loading-indicator/loading-progress-service';

export const HttpRequestInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,

): Observable<HttpEvent<unknown>> => {
  const wrLicenseService = inject(WrLicenseService);
  const loadingService = inject(LoadingProgressService);
  const token = wrLicenseService.getBearerToken();
  const baseUrl = environment.apiUrl;
  const envInjector = inject(EnvironmentInjector);
  loadingService.startRequest();
  if (req.url.lastIndexOf('i18n') > -1) {
    return next(req).pipe(
      finalize(() => loadingService.endRequest())
    );
  }
  const url = req.url.lastIndexOf('api') > -1 ? req.url : 'api/' + req.url;
  let newReq: HttpRequest<any>;
  if (token) {
    newReq = req.clone({
      headers: req.headers.set('Authorization', 'Bearer ' + token),
      url: `${baseUrl}${url}`,
    });
  } else {
    newReq = req.clone({
      url: `${baseUrl}${url}`,
    });
  }
  return next(newReq)
    .pipe(
      catchError((err: HttpErrorResponse) => {
        if (err instanceof HttpErrorResponse) {
          runInInjectionContext(envInjector, () => {
            const router = inject(Router);
            const toastrService = inject(ToastrService);
            const translationService = inject(TranslationService);

            if (err.status === 401) {
              router.navigate(['login']);
            } else if (err.status === 403) {
              toastrService.error(
                translationService.getValue('ACCESS_FORBIDDEN')
              );
            } else if (err.error && err.error.length >= 0) {
              toastrService.error(err.error[0]);
            } else if (err.error && err.error?.messages?.length > 0) {
              toastrService.error(err?.error?.messages[0]);
            }
          })
        }
        return throwError(() => err);
      }),
      finalize(() => loadingService.endRequest())
    );
}



