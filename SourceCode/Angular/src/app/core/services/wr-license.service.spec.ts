import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { JwtHelperService } from '@auth0/angular-jwt';
import { environment } from '@environments/environment';

import { WrLicenseService } from './wr-license.service';

describe('WrLicenseService', () => {
  let service: WrLicenseService;
  let httpMock: HttpTestingController;
  let router: jasmine.SpyObj<Router>;
  let jwtHelper: jasmine.SpyObj<JwtHelperService>;

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    jwtHelper = jasmine.createSpyObj<JwtHelperService>('JwtHelperService', ['decodeToken']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        WrLicenseService,
        { provide: Router, useValue: router },
        { provide: JwtHelperService, useValue: jwtHelper },
      ],
    });
    service = TestBed.inject(WrLicenseService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('onActivateLicense', () => {
    it('POSTs the purchase code, stores license key and navigates to login on success', () => {
      service.onActivateLicense('CODE-123');
      const req = httpMock.expectOne(`${environment.apiUrl}/wrlicense/validate`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ purchaseCode: 'CODE-123' });
      req.flush({ success: true });
      expect(localStorage.getItem('license_key')).toBe('CODE-123');
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('does not store or navigate when validation fails', () => {
      const consoleSpy = spyOn(console, 'error');
      service.onActivateLicense('BAD');
      httpMock
        .expectOne(`${environment.apiUrl}/wrlicense/validate`)
        .flush({ success: false });
      expect(localStorage.getItem('license_key')).toBeNull();
      expect(router.navigate).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('tolerates HTTP errors', () => {
      const consoleSpy = spyOn(console, 'error');
      service.onActivateLicense('CODE-123');
      httpMock
        .expectOne(`${environment.apiUrl}/wrlicense/validate`)
        .flush({}, { status: 500, statusText: 'boom' });
      expect(localStorage.getItem('license_key')).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('token + auth object helpers', () => {
    it('getJWtToken decodes the stored bearer token', () => {
      jwtHelper.decodeToken.and.returnValue({ unique_name: 'admin' } as any);
      localStorage.setItem('access_token', 'jwt.jwt.jwt');
      expect(service.getJWtToken()).toEqual({ unique_name: 'admin' });
      expect(jwtHelper.decodeToken as any).toHaveBeenCalledWith('jwt.jwt.jwt');
    });

    it('getJWtToken returns null when no token stored', () => {
      expect(service.getJWtToken()).toBeNull();
      expect(jwtHelper.decodeToken).not.toHaveBeenCalled();
    });

    it('getBearerToken returns the raw stored token', () => {
      localStorage.setItem('access_token', 'raw-token');
      expect(service.getBearerToken()).toBe('raw-token');
      expect(service.getBearerToken()).toBe('raw-token');
    });

    it('getAuthObject parses the stored auth object', () => {
      localStorage.setItem('auth_obj', JSON.stringify({ id: 'u1', userName: 'admin' }));
      expect(service.getAuthObject()).toEqual({ id: 'u1', userName: 'admin' } as any);
    });

    it('getAuthObject returns null when nothing stored', () => {
      expect(service.getAuthObject()).toBeNull();
    });

    it('setTokenValue stores bearerToken and nested user separately', () => {
      service.setTokenValue({ bearerToken: 'tok', user: { id: 'u1' } });
      expect(localStorage.getItem('access_token')).toBe('tok');
      expect(JSON.parse(localStorage.getItem('auth_obj')!)).toEqual({ id: 'u1' });
    });

    it('setTokenValue stores the payload itself when there is no nested user', () => {
      service.setTokenValue({ id: 'u2' });
      expect(localStorage.getItem('access_token')).toBeNull();
      expect(JSON.parse(localStorage.getItem('auth_obj')!)).toEqual({ id: 'u2' });
    });

    it('setTokenValue ignores null input', () => {
      service.setTokenValue(null);
      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('auth_obj')).toBeNull();
    });

    it('removeToken clears both keys', () => {
      localStorage.setItem('access_token', 't');
      localStorage.setItem('auth_obj', '{}');
      service.removeToken();
      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('auth_obj')).toBeNull();
    });
  });
});
