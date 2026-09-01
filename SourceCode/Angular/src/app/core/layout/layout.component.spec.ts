import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, NavigationEnd, Router, provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { BreakpointObserver } from '@angular/cdk/layout';
import { BehaviorSubject, Subject, of } from 'rxjs';

import { LayoutComponent } from './layout.component';
import { SecurityService } from '@core/security/security.service';
import { CommonService } from '@core/services/common.service';
import { TranslationService } from '@core/services/translation.service';
import { NotificationService } from '../../notification/notification.service';
import { SignalrService } from '@core/services/signalr.service';
import { ToastrService } from '@core/services/toastr.service';
import { BreakpointsService } from '@core/services/breakpoints.service';
import { MenuService } from '@core/services/menu.service';
import { User } from '@core/domain-classes/user';
import { CompanyProfile } from '@core/domain-classes/company-profile';

describe('LayoutComponent', () => {
  let component: LayoutComponent;
  let fixture: ComponentFixture<LayoutComponent>;
  let router: Router;
  let routerEvents: Subject<NavigationEnd>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let lanDir$: BehaviorSubject<string>;

  beforeEach(() => {
    const securityService = jasmine.createSpyObj<SecurityService>('SecurityService', [
      'hasClaim', 'logout', 'updateSelectedLocation',
    ]);
    (securityService as any).securityObject$ = new BehaviorSubject<User | null>(null).asObservable();
    (securityService as any).companyProfile = new BehaviorSubject<CompanyProfile | null>(null).asObservable();
    (securityService as any).isPOSPermissionOnly = false;
    (securityService as any).Token = null;
    (securityService as any).currencyCode = 'USD';

    const commonService = jasmine.createSpyObj<CommonService>('CommonService', [
      'getLocationsForCurrentUser', 'setSideMenuStatus',
    ]);
    (commonService as any).sideMenuStatus$ = new BehaviorSubject<boolean>(false).asObservable();
    commonService.getLocationsForCurrentUser.and.returnValue(of({ locations: [], selectedLocation: null } as any));

    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', [
      'getSelectedLanguage', 'setLanguage', 'getValue',
    ]);
    lanDir$ = new BehaviorSubject<string>('ltr');
    (translationService as any).lanDir$ = lanDir$.asObservable();
    translationService.getSelectedLanguage.and.returnValue('en');
    translationService.setLanguage.and.returnValue(of(null));

    const notificationService = jasmine.createSpyObj<NotificationService>('NotificationService', [
      'markAllAsRead', 'getUserNotificationCount', 'getTop10UserNotification', 'markAsReadNotification',
    ]);
    notificationService.markAllAsRead.and.returnValue(of({} as any));
    notificationService.getUserNotificationCount.and.returnValue(of(0));
    notificationService.getTop10UserNotification.and.returnValue(of([] as any));
    notificationService.markAsReadNotification.and.returnValue(of({} as any));

    const signalrService = jasmine.createSpyObj<SignalrService>('SignalrService', ['logout']);
    (signalrService as any).userNotification$ = new Subject<string>().asObservable();

    const menuService = jasmine.createSpyObj<MenuService>('MenuService', ['loadUserMenu']);
    menuService.loadUserMenu.and.resolveTo(undefined);
    (menuService as any).visibleMenuItems = jasmine.createSpy('visibleMenuItems').and.returnValue([]);

    const breakpointObserver = {
      observe: () => of({ matches: false, breakpoints: {} }),
    } as unknown as BreakpointObserver;

    routerEvents = new Subject<NavigationEnd>();

    TestBed.configureTestingModule({
      imports: [LayoutComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: SecurityService, useValue: securityService },
        { provide: CommonService, useValue: commonService },
        { provide: TranslationService, useValue: translationService },
        { provide: NotificationService, useValue: notificationService },
        { provide: SignalrService, useValue: signalrService },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'error']) },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
        {
          provide: BreakpointsService,
          useValue: { isMobile$: new BehaviorSubject(false), isTablet$: new BehaviorSubject(false) },
        },
        { provide: MenuService, useValue: menuService },
        { provide: BreakpointObserver, useValue: breakpointObserver },
        { provide: ActivatedRoute, useValue: { snapshot: { routeConfig: { path: 'dashboard' } } } },
      ],
    });

    router = TestBed.inject(Router);
    spyOnProperty(router, 'url', 'get').and.returnValue('/dashboard');
    Object.defineProperty(router, 'events', { value: routerEvents.asObservable(), configurable: true });
  });

  afterEach(() => {
    document.body.classList.remove('rtl', 'side-closed', 'submenu-closed');
    document.documentElement.removeAttribute('dir');
    localStorage.clear();
  });

  function createFixture(): void {
    fixture = TestBed.createComponent(LayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and render header and sidebar with sidebar visible on non-pos url', () => {
    createFixture();
    expect(component).toBeTruthy();
    expect(component.hideSidebar).toBeFalse();
  });

  it('should hide sidebar on /pos navigation and show it again elsewhere', () => {
    createFixture();
    routerEvents.next(new NavigationEnd(1, '/pos', '/pos'));
    expect(component.hideSidebar).toBeTrue();

    routerEvents.next(new NavigationEnd(2, '/dashboard', '/dashboard'));
    expect(component.hideSidebar).toBeFalse();
  });

  it('should apply rtl settings when language direction becomes rtl', async () => {
    createFixture();
    lanDir$.next('rtl');
    await fixture.whenStable();
    expect(component.direction).toBe('rtl');
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
    expect(document.body.classList.contains('rtl')).toBeTrue();
    expect(localStorage.getItem('isRtl')).toBe('true');
  });

  it('should restore ltr settings when language direction becomes ltr', async () => {
    document.documentElement.setAttribute('dir', 'rtl');
    document.body.classList.add('rtl');
    createFixture();
    lanDir$.next('ltr');
    await fixture.whenStable();
    expect(component.direction).toBe('ltr');
    expect(document.documentElement.hasAttribute('dir')).toBeFalse();
    expect(document.body.classList.contains('rtl')).toBeFalse();
    expect(localStorage.getItem('isRtl')).toBe('false');
  });

  it('should close side menus when collapsed_menu is true in localStorage', () => {
    localStorage.setItem('collapsed_menu', 'true');
    createFixture();
    expect(document.body.classList.contains('side-closed')).toBeTrue();
    expect(document.body.classList.contains('submenu-closed')).toBeTrue();
  });

  it('should persist collapsed_menu false when not stored and menu not collapsed', () => {
    localStorage.removeItem('collapsed_menu');
    createFixture();
    expect(localStorage.getItem('collapsed_menu')).toBe('false');
    expect(document.body.classList.contains('side-closed')).toBeFalse();
    expect(document.body.classList.contains('submenu-closed')).toBeFalse();
  });
});
