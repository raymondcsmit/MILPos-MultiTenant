import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';

import { SecurityService } from './security.service';
import { ClonerService } from '@core/services/clone.service';
import { TranslationService } from '@core/services/translation.service';
import { CacheSyncService } from '@core/services/cache-sync.service';
import { WrLicenseService } from '@core/services/wr-license.service';
import { BusinessLocationService } from '../../business-location/business-location.service';
import { CompanyProfileService } from '../../company-profile/company-profile.service';
import { CompanyProfile } from '@core/domain-classes/company-profile';
import { BusinessLocation } from '@core/domain-classes/business-location';

describe('SecurityService', () => {
  let service: SecurityService;
  let httpMock: HttpTestingController;
  let router: { navigate: jasmine.Spy };
  let cloner: ClonerService;
  let translation: TranslationService;
  let cacheSync: CacheSyncService;
  let businessLocation: BusinessLocationService;
  let companyProfile: CompanyProfileService;
  let wrLicense: WrLicenseService;

  const keyValues = {
    authObj: 'auth_obj',
    COMPANY_PROFILE: 'company_profile',
    BEARER_TOKEN: 'access_token',
    LOCATION_CACHE: 'location_cache',
  };

  function makeWrLicense() {
    return {
      keyValues,
      getJWtToken: jasmine.createSpy('getJWtToken').and.returnValue(null),
      getBearerToken: jasmine.createSpy('getBearerToken').and.returnValue(null),
      getAuthObject: jasmine.createSpy('getAuthObject').and.returnValue(null),
      setTokenValue: jasmine.createSpy('setTokenValue'),
      removeToken: jasmine.createSpy('removeToken'),
    } as unknown as WrLicenseService;
  }

  function makeDeps() {
    router = { navigate: jasmine.createSpy('navigate') };
    cloner = { deepClone: (o: any) => JSON.parse(JSON.stringify(o)) } as ClonerService;
    translation = { getValue: (k: string) => k } as TranslationService;
    cacheSync = {
      syncMasterData: jasmine.createSpy('syncMasterData'),
      clearCache: jasmine.createSpy('clearCache'),
    } as unknown as CacheSyncService;
    businessLocation = {
      getLocations: jasmine.createSpy('getLocations').and.returnValue(of([])),
    } as unknown as BusinessLocationService;
    companyProfile = {
      getCompanyProfile: jasmine.createSpy('getCompanyProfile').and.returnValue(of(null)),
    } as unknown as CompanyProfileService;
    wrLicense = makeWrLicense();
  }

  beforeEach(() => {
    makeDeps();
    TestBed.configureTestingModule({
      imports: [],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SecurityService,
        { provide: Router, useValue: router },
        { provide: ClonerService, useValue: cloner },
        { provide: TranslationService, useValue: translation },
        { provide: CacheSyncService, useValue: cacheSync },
        { provide: BusinessLocationService, useValue: businessLocation },
        { provide: CompanyProfileService, useValue: companyProfile },
        { provide: WrLicenseService, useValue: wrLicense },
      ],
    });
    service = TestBed.inject(SecurityService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('login', () => {
    const loginEntity = { userName: 'admin', password: 'x' };

    it('posts credentials to authentication and stores auth/token', () => {
      const token = { 'POS_POS': 'true', 'locationIds': 'loc1' };
      (wrLicense.getJWtToken as jasmine.Spy).and.returnValue(token);
      const auth = {
        isAuthenticated: true,
        bearerToken: 'abc.def.ghi',
        user: { userName: 'admin', email: 'a@b.c' },
        menus: [{ id: 1 }],
      };

      let result: any;
      service.login(loginEntity as any).subscribe((r) => (result = r));
      const req = httpMock.expectOne('authentication');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(loginEntity);
      req.flush(auth);

      expect(wrLicense.setTokenValue).toHaveBeenCalledWith(auth);
      expect(wrLicense.removeToken).not.toHaveBeenCalled();
      expect(localStorage.getItem('userMenus')).toBe(JSON.stringify(auth.menus));
      expect(localStorage.getItem(keyValues.authObj)).toBeNull();
      expect(result).toBe(auth);
      expect(cacheSync.syncMasterData).toHaveBeenCalled();
    });

    it('throws and removes token when no locations are assigned', () => {
      const token = { 'POS_POS': 'true' };
      (wrLicense.getJWtToken as jasmine.Spy).and.returnValue(token);
      const auth = { isAuthenticated: true, bearerToken: 't', user: { userName: 'u' } };

      let error: any;
      service.login(loginEntity as any).subscribe({ error: (e) => (error = e) });
      const req = httpMock.expectOne('authentication');
      req.flush(auth);

      expect(wrLicense.removeToken).toHaveBeenCalled();
      expect(error).toBeDefined();
      expect(error.message).toContain('No location assigned');
    });

    it('pre-loads locations and profile then syncs master data', () => {
      const token = { 'POS_POS': 'true', 'locationIds': 'loc1' };
      (wrLicense.getJWtToken as jasmine.Spy).and.returnValue(token);
      const auth = { bearerToken: 't', user: { userName: 'u' } };
      const locs: BusinessLocation[] = [{ id: 'loc1', name: 'Main' }];
      const profile = { title: 'ACME', locations: locs } as CompanyProfile;
      (businessLocation.getLocations as jasmine.Spy).and.returnValue(of(locs));
      (companyProfile.getCompanyProfile as jasmine.Spy).and.returnValue(of(profile));

      let result: any;
      service.login(loginEntity as any).subscribe((r) => (result = r));
      httpMock.expectOne('authentication').flush(auth);

      expect(wrLicense.setTokenValue).toHaveBeenCalled();
      // profile + locations cached via updateProfile/setLocationsCache
      expect(service['currencyCode']).toBe(stringOrEmpty(profile));
      expect(sessionStorage.getItem(keyValues.LOCATION_CACHE)).toBe(JSON.stringify(locs));
      expect(cacheSync.syncMasterData).toHaveBeenCalled();
      expect(result).toBe(auth);
      expect(service.securityObject$).toBeTruthy();
    });

    it('still resolves when pre-load profile/location fails', () => {
      const token = { 'POS_POS': 'true', 'locationIds': 'loc1' };
      (wrLicense.getJWtToken as jasmine.Spy).and.returnValue(token);
      const auth = { bearerToken: 't', user: { userName: 'u' } };
      (businessLocation.getLocations as jasmine.Spy).and.returnValue(throwError(() => new Error('boom')));
      (companyProfile.getCompanyProfile as jasmine.Spy).and.returnValue(throwError(() => new Error('boom')));

      let result: any;
      service.login(loginEntity as any).subscribe((r) => (result = r));
      httpMock.expectOne('authentication').flush(auth);

      expect(result).toBe(auth);
      expect(cacheSync.syncMasterData).toHaveBeenCalled();
    });
  });

  describe('isLogin / getUserDetail', () => {
    it('reports not logged in when no auth object exists', () => {
      expect(service.isLogin()).toBeFalse();
      expect(service.getUserDetail()).toBeNull();
    });

    it('reports logged in when auth object exists', () => {
      const user = { userName: 'admin', email: 'a@b.c' };
      (wrLicense.getAuthObject as jasmine.Spy).and.returnValue(user);
      expect(service.isLogin()).toBeTrue();
      expect(service.getUserDetail()).toEqual(jasmine.objectContaining(user));
    });
  });

  describe('Claims / hasClaim', () => {
    function seedToken(token: any) {
      (service as any)._token = token;
      (service as any)._claims = [];
    }

    it('exposes only true-valued claims from the token', () => {
      seedToken({ 'POS_POS': 'true', 'INVE_VIEW': 'false', 'CUST_ADD': 'true', 'locationIds': 'l1' });
      expect(service.Claims).toEqual(['POS_POS', 'CUST_ADD']);
    });

    it('returns empty claims when no token', () => {
      expect(service.Claims).toEqual([]);
    });

    it('hasClaim true for a matching claim', () => {
      seedToken({ 'POS_POS': 'true' });
      expect(service.hasClaim('POS_POS')).toBeTrue();
      expect(service.hasClaim('POS_POS', undefined)).toBeTrue();
    });

    it('hasClaim false for missing claim', () => {
      seedToken({ 'POS_POS': 'true' });
      expect(service.hasClaim('CUST_ADD')).toBeFalse();
    });

    it('is case-insensitive', () => {
      seedToken({ 'POS_POS': 'true' });
      expect(service.hasClaim('pos_pos')).toBeTrue();
    });

    it('supports claim:value form', () => {
      seedToken({ 'tenantId': 'ABC' });
      expect(service.hasClaim('tenantId:ABC')).toBeTrue();
      expect(service.hasClaim('tenantId:XYZ')).toBeFalse();
    });

    it('supports arrays of claims returning true if any matches', () => {
      seedToken({ 'POS_POS': 'true' });
      expect(service.hasClaim(['CUST_ADD', 'POS_POS'])).toBeTrue();
      expect(service.hasClaim(['CUST_ADD', 'INVE_VIEW'])).toBeFalse();
    });

    it('isPOSPermissionOnly when exactly one POS_POS claim', () => {
      seedToken({ 'POS_POS': 'true' });
      expect(service.isPOSPermissionOnly).toBeTrue();
      seedToken({ 'POS_POS': 'true', 'CUST_ADD': 'true' });
      expect(service.isPOSPermissionOnly).toBeFalse();
    });
  });

  describe('setCompany / setLocationsCache', () => {
    it('stores an explicit profile and emits it', () => {
      const profile = { title: 'ACME', locations: [] as BusinessLocation[] } as CompanyProfile;
      service.setCompany(profile);
      expect(sessionStorage.getItem(keyValues.COMPANY_PROFILE)).toBe(JSON.stringify(profile));
      let emitted: CompanyProfile | null = null as any;
      service.companyProfile.subscribe((p) => (emitted = p));
      expect(emitted).toEqual(profile);
    });

    it('restores cached locations into a stored profile missing them', () => {
      const profile = { title: 'ACME', locations: [] as BusinessLocation[] } as CompanyProfile;
      sessionStorage.setItem(keyValues.COMPANY_PROFILE, JSON.stringify(profile));
      const locs = [{ id: 'l1', name: 'Main' }] as BusinessLocation[];
      sessionStorage.setItem(keyValues.LOCATION_CACHE, JSON.stringify(locs));
      service.setCompany();
      let emitted: CompanyProfile | null = null as any;
      service.companyProfile.subscribe((p) => (emitted = p));
      expect(emitted!.locations).toEqual(locs);
    });

    it('setLocationsCache stores and merges into the profile stream', () => {
      service.setCompany({ title: 'X', locations: [] as BusinessLocation[] } as CompanyProfile);
      const locs = [{ id: 'l1', name: 'Main' }] as BusinessLocation[];
      service.setLocationsCache(locs);
      expect(sessionStorage.getItem(keyValues.LOCATION_CACHE)).toBe(JSON.stringify(locs));
      let emitted: CompanyProfile | null = null as any;
      service.companyProfile.subscribe((p) => (emitted = p));
      expect(emitted!.locations).toEqual(locs);
    });
  });

  describe('locations$ / allLocations$', () => {
    function seedProfileWithLocations(locs: BusinessLocation[], locationIds: string) {
      service.setCompany({ title: 'X', locations: locs } as CompanyProfile);
      (wrLicense.getJWtToken as jasmine.Spy).and.returnValue({ 'locationIds': locationIds });
      service['_selectedLocation'] = '';
    }

    it('filters locations by token locationIds and selects first when none selected', () => {
      const locs = [
        { id: 'l1', name: 'Main' },
        { id: 'l2', name: 'Branch' },
      ] as BusinessLocation[];
      seedProfileWithLocations(locs, 'l2');
      // spy setTimeout to keep deterministic
      spyOn(window, 'setTimeout').and.callFake((fn: any) => fn());

      let result: any;
      service.locations$.subscribe((r) => (result = r));
      expect(result.locations.map((l: any) => l.id)).toEqual(['l2']);
      expect(result.selectedLocation).toBe('l2');
    });

    it('returns empty locations when no profile', () => {
      let result: any;
      service.locations$.subscribe((r) => (result = r));
      expect(result.locations).toEqual([]);
    });

    it('allLocations$ prepends ALL_LOCATIONS when user has every location', () => {
      const locs = [{ id: 'l1', name: 'Main' }] as BusinessLocation[];
      service.setCompany({ title: 'X', locations: locs } as CompanyProfile);
      (wrLicense.getJWtToken as jasmine.Spy).and.returnValue({ 'locationIds': 'l1' });
      service['_selectedLocation'] = 'l1';

      let result: any;
      service.allLocations$.subscribe((r) => (result = r));
      expect(result.locations[0].id).toBe('');
      expect(result.locations[0].name).toBe('ALL_LOCATIONS');
      expect(result.locations.length).toBe(2);
    });
  });

  describe('financial years', () => {
    it('allFinancialYears$ selects the stored id or first open year', () => {
      service.setCompany({
        title: 'X',
        financialYears: [
          { id: 'fy1', isClosed: true },
          { id: 'fy2', isClosed: false },
        ],
      } as any);
      localStorage.removeItem('selectedFinancialYearId');
      let result: any;
      service.allFinancialYears$.subscribe((r) => (result = r));
      expect(result.financialYears.length).toBe(2);
      expect(result.selectedFinancialYearId).toBe('fy2');
    });
  });

  describe('updateProfile', () => {
    it('sets currency, prefixes logo url, and restores cached locations when absent', () => {
      sessionStorage.setItem(keyValues.LOCATION_CACHE, JSON.stringify([{ id: 'l1', name: 'Main' }]));
      const profile = { currencyCode: 'PKR', logoUrl: '/logo.png', locations: [] as BusinessLocation[] } as CompanyProfile;
      service.updateProfile(profile);
      expect(service.currencyCode).toBe('PKR');
      expect(profile.logoUrl).toContain('logo.png');
      expect(profile.locations!.length).toBe(1);
    });
  });

  describe('updateSelectedLocation', () => {
    it('persists selected location into auth object and state', () => {
      const user = { userName: 'u', selectedLocation: '' };
      localStorage.setItem(keyValues.authObj, JSON.stringify(user));
      (wrLicense.getAuthObject as jasmine.Spy).and.returnValue(user);
      service.updateSelectedLocation('loc9');
      const stored = JSON.parse(localStorage.getItem(keyValues.authObj)!);
      expect(stored.selectedLocation).toBe('loc9');
      expect(service.SelectedLocation).toBe('loc9');
    });
  });

  describe('resetSecurityObject / logout', () => {
    it('clears storage, resets state, clears cache and navigates to /login', () => {
      service.setCompany({ title: 'X' } as CompanyProfile);
      localStorage.setItem(keyValues.BEARER_TOKEN, 't');
      localStorage.setItem('userMenus', '[]');
      sessionStorage.setItem(keyValues.LOCATION_CACHE, '[]');
      (wrLicense.getAuthObject as jasmine.Spy).and.returnValue(null);

      service.logout();

      expect(localStorage.getItem(keyValues.BEARER_TOKEN)).toBeNull();
      expect(localStorage.getItem('userMenus')).toBeNull();
      expect(sessionStorage.getItem(keyValues.LOCATION_CACHE)).toBeNull();
      expect(cacheSync.clearCache).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
      expect(service.Token).toBeNull();
    });
  });

  function stringOrEmpty(p: CompanyProfile): string {
    return p.currencyCode ?? '';
  }
});
