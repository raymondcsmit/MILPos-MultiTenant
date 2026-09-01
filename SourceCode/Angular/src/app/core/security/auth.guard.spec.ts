import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router, Route } from '@angular/router';

import { AuthGuard } from './auth.guard';
import { SecurityService } from './security.service';
import { TranslationService } from '@core/services/translation.service';
import { ToastrService } from '@core/services/toastr.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let security: jasmine.SpyObj<SecurityService>;
  let router: { navigate: jasmine.Spy; url: string };
  let toastr: jasmine.SpyObj<ToastrService>;
  let translation: { getValue: jasmine.Spy };

  function routeSnap(data: any): ActivatedRouteSnapshot {
    return { data } as unknown as ActivatedRouteSnapshot;
  }
  const stateSnap = {} as RouterStateSnapshot;

  beforeEach(() => {
    security = jasmine.createSpyObj<SecurityService>('SecurityService', ['isLogin', 'hasClaim']);
    security.isLogin.and.returnValue(true);
    security.hasClaim.and.returnValue(true);
    router = { navigate: jasmine.createSpy('navigate'), url: '/dashboard' };
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['error']);
    translation = { getValue: jasmine.createSpy('getValue').and.callFake((k: string) => k) };

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: SecurityService, useValue: security },
        { provide: Router, useValue: router },
        { provide: ToastrService, useValue: toastr },
        { provide: TranslationService, useValue: translation },
      ],
    });
    guard = TestBed.inject(AuthGuard);
  });

  describe('canActivate', () => {
    it('allows when logged in and no claim required', () => {
      expect(guard.canActivate(routeSnap({}), stateSnap)).toBeTrue();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('allows when logged in and claim holds', () => {
      security.hasClaim.and.returnValue(true);
      expect(guard.canActivate(routeSnap({ claimType: 'POS_POS' }), stateSnap)).toBeTrue();
    });

    it('denies when logged in but lacks the claim', () => {
      security.hasClaim.and.returnValue(false);
      expect(guard.canActivate(routeSnap({ claimType: 'CUST_ADD' }), stateSnap)).toBeFalse();
      expect(toastr.error).toHaveBeenCalledWith('UI_PERMISSION_ERROR');
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('does not navigate when already on /login on permission failure', () => {
      security.hasClaim.and.returnValue(false);
      router.url = '/login';
      expect(guard.canActivate(routeSnap({ claimType: 'CUST_ADD' }), stateSnap)).toBeFalse();
      expect(router.navigate).not.toHaveBeenCalled();
      expect(toastr.error).toHaveBeenCalled();
    });

    it('denies and redirects when not logged in', () => {
      security.isLogin.and.returnValue(false);
      expect(guard.canActivate(routeSnap({}), stateSnap)).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['login']);
    });
  });

  describe('canActivateChild', () => {
    it('allows when logged in and claim holds', () => {
      expect(guard.canActivateChild(routeSnap({ claimType: 'POS_POS' }), stateSnap)).toBeTrue();
    });

    it('denies with error toast when child claim missing', () => {
      security.hasClaim.and.returnValue(false);
      expect(guard.canActivateChild(routeSnap({ claimType: 'CUST_ADD' }), stateSnap)).toBeFalse();
      expect(toastr.error).toHaveBeenCalledWith('UI_PERMISSION_ERROR');
    });

    it('denies and redirects when not logged in', () => {
      security.isLogin.and.returnValue(false);
      expect(guard.canActivateChild(routeSnap({}), stateSnap)).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['login']);
    });
  });

  describe('canLoad', () => {
    it('allows when logged in', () => {
      expect(guard.canLoad({} as Route)).toBeTrue();
    });

    it('denies and redirects when not logged in', () => {
      security.isLogin.and.returnValue(false);
      expect(guard.canLoad({} as Route)).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['login']);
    });
  });
});
