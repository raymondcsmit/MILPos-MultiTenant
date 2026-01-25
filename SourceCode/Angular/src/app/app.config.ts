import { ApplicationConfig, importProvidersFrom, inject, provideAppInitializer, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app.routes';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpRequestInterceptor } from './http-request-interceptor';
import { provideNativeDateAdapter } from '@angular/material/core';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { FeatherModule } from 'angular-feather';
import { allIcons } from 'angular-feather/icons';
import { JWT_OPTIONS, JwtHelperService, JwtModule } from '@auth0/angular-jwt';
import { CurrencyPipe } from '@angular/common';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { loadingInterceptor } from '@core/services/loading.interceptor';
import { initializeApp } from '@core/security/initialize-app-factory';
import { ToastrService } from '@core/services/toastr.service';
import { SecurityService } from '@core/security/security.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideTranslateService({
      loader: provideTranslateHttpLoader({ prefix: "./i18n/" }),
      fallbackLang: 'en',
      lang: 'en'
    }),
    CurrencyPipe,
    provideHttpClient(
      withInterceptors([HttpRequestInterceptor]),
    ),
    importProvidersFrom(
      JwtModule.forRoot({
        config: {
          tokenGetter: () => localStorage.getItem('access_token'),
          allowedDomains: ['localhost:4200'],
          disallowedRoutes: []
        },
      })
    ),
    { provide: JWT_OPTIONS, useValue: JWT_OPTIONS },
    JwtHelperService,
    provideAppInitializer(() =>
      initializeApp(inject(ToastrService), inject(SecurityService))()
    ),
    provideNativeDateAdapter(),
    provideStoreDevtools({
      connectInZone: true,
      maxAge: 25
    }),
    importProvidersFrom(
      JwtModule,
      MatSnackBarModule,
      FeatherModule.pick(allIcons)
    ),
    provideRouter(routes, withHashLocation()),

  ]
};
