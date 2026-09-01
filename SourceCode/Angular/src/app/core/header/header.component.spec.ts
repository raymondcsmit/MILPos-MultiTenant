import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, NavigationEnd, Router, provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, Subject, of } from 'rxjs';

import { HeaderComponent } from './header.component';
import { SecurityService } from '@core/security/security.service';
import { CommonService } from '@core/services/common.service';
import { TranslationService } from '@core/services/translation.service';
import { NotificationService } from '../../notification/notification.service';
import { SignalrService } from '@core/services/signalr.service';
import { ToastrService } from '@core/services/toastr.service';
import { BreakpointsService } from '@core/services/breakpoints.service';
import { User } from '@core/domain-classes/user';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let securityService: jasmine.SpyObj<SecurityService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let notificationService: jasmine.SpyObj<NotificationService>;
  let signalrService: jasmine.SpyObj<SignalrService>;
  let toastService: jasmine.SpyObj<ToastrService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let breakpointsService: { isMobile$: BehaviorSubject<boolean>; isTablet$: BehaviorSubject<boolean> };
  let router: Router;
  let routerEvents: Subject<NavigationEnd>;

  function create(activatedRoutePath = 'dashboard'): ComponentFixture<HeaderComponent> {
    const f = TestBed.createComponent(HeaderComponent);
    (TestBed.inject(ActivatedRoute) as any).snapshot.routeConfig.path = activatedRoutePath;
    return f;
  }

  beforeEach(() => {
    securityService = jasmine.createSpyObj<SecurityService>('SecurityService', [
      'hasClaim', 'logout', 'updateSelectedLocation',
    ]);
    (securityService as any).securityObject$ = new BehaviorSubject<User | null>(null).asObservable();
    (securityService as any).companyProfile = new BehaviorSubject<any>(null).asObservable();
    (securityService as any).isPOSPermissionOnly = false;
    (securityService as any).Token = null;

    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getLocationsForCurrentUser', 'setSideMenuStatus']);
    (commonService as any).sideMenuStatus$ = new BehaviorSubject<boolean>(false).asObservable();
    commonService.getLocationsForCurrentUser.and.returnValue(
      of({ locations: [{ id: 'l1', name: 'Main' }], selectedLocation: 'l1' } as any)
    );

    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', [
      'getSelectedLanguage', 'setLanguage', 'getValue',
    ]);
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    translationService.getSelectedLanguage.and.returnValue('en');
    translationService.setLanguage.and.returnValue(of(null));

    notificationService = jasmine.createSpyObj<NotificationService>('NotificationService', [
      'markAllAsRead', 'getUserNotificationCount', 'getTop10UserNotification', 'markAsReadNotification',
    ]);
    notificationService.markAllAsRead.and.returnValue(of({} as any));
    notificationService.getUserNotificationCount.and.returnValue(of(3));
    notificationService.getTop10UserNotification.and.returnValue(of([] as any));
    notificationService.markAsReadNotification.and.returnValue(of({} as any));

    signalrService = jasmine.createSpyObj<SignalrService>('SignalrService', ['logout']);
    (signalrService as any).userNotification$ = new Subject<string>().asObservable();

    toastService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success']);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    breakpointsService = { isMobile$: new BehaviorSubject(false), isTablet$: new BehaviorSubject(false) };
    routerEvents = new Subject<NavigationEnd>();

    TestBed.configureTestingModule({
      imports: [HeaderComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: SecurityService, useValue: securityService },
        { provide: CommonService, useValue: commonService },
        { provide: TranslationService, useValue: translationService },
        { provide: NotificationService, useValue: notificationService },
        { provide: SignalrService, useValue: signalrService },
        { provide: ToastrService, useValue: toastService },
        { provide: MatDialog, useValue: dialog },
        { provide: BreakpointsService, useValue: breakpointsService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { routeConfig: { path: 'dashboard' } } },
        },
      ],
    });
    router = TestBed.inject(Router);
    spyOnProperty(router, 'url', 'get').and.returnValue('/dashboard');
    Object.defineProperty(router, 'events', { value: routerEvents.asObservable(), configurable: true });
    spyOn(router, 'navigate');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create and wire initial data', () => {
    fixture = create();
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.locations.length).toBe(1);
    expect(component.selectedLocation).toBe('l1');
    expect(component.hasOnlyPOSPermission).toBeFalse();
    expect(component.isOpenSidebar).toBeFalse();
    expect(component.isMobile).toBeFalse();
  });

  it('marks pos page when route snapshot path contains pos', () => {
    fixture = create('pos');
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.isPosPage).toBeTrue();
  });

  it('toggles pos-page body class on NavigationEnd', () => {
    fixture = create();
    component = fixture.componentInstance;
    fixture.detectChanges();
    routerEvents.next(new NavigationEnd(1, '/pos', '/pos'));
    expect(component.isPosPage).toBeTrue();
    expect(document.body.classList.contains('pos-page')).toBeTrue();
    routerEvents.next(new NavigationEnd(2, '/dashboard', '/dashboard'));
    expect(component.isPosPage).toBeFalse();
    expect(document.body.classList.contains('pos-page')).toBeFalse();
  });

  it('isSuperAdmin prefers user flag then falls back to token claim', () => {
    fixture = create();
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.isSuperAdmin).toBeFalse();
    (component as any).appUserAuth = { isSuperAdmin: true } as User;
    expect(component.isSuperAdmin).toBeTrue();
    (component as any).appUserAuth = null;
    (securityService as any).Token = { isSuperAdmin: 'true' };
    expect(component.isSuperAdmin).toBeTrue();
    (securityService as any).Token = { isSuperAdmin: false };
    expect(component.isSuperAdmin).toBeFalse();
    (securityService as any).Token = null;
    expect(component.isSuperAdmin).toBeFalse();
  });

  it('securityObject$ updates the user and profile path', () => {
    const subject = new BehaviorSubject<User | null>(null);
    (securityService as any).securityObject$ = subject.asObservable();
    fixture = create();
    component = fixture.componentInstance;
    fixture.detectChanges();
    subject.next({ id: 'u1', profilePhoto: 'files/p1.png' } as User);
    expect(component.appUserAuth).toEqual({ id: 'u1', profilePhoto: 'files/p1.png' } as any);
    expect(component.profilePath).toContain('files/p1.png');
    subject.next({ id: 'u1' } as User);
    expect(component.profilePath).toBe('');
  });

  it('companyProfile sets logo, languages and activates default language', () => {
    const subject = new BehaviorSubject<any>(null);
    (securityService as any).companyProfile = subject.asObservable();
    translationService.getSelectedLanguage.and.returnValue('fr');
    fixture = create();
    component = fixture.componentInstance;
    fixture.detectChanges();
    subject.next({ logoUrl: 'logo.png', languages: [{ code: 'en', active: false }, { code: 'fr', name: 'French', active: false }] });
    expect(component.logoImage).toBe('logo.png');
    expect(component.languages.length).toBe(2);
    expect(component.language?.code).toBe('fr');
    expect(component.languages.find((l) => l.code === 'fr')!.active).toBeTrue();
    expect(component.languages.find((l) => l.code === 'en')!.active).toBeFalse();
  });

  it('notification signal triggers count + list fetch', () => {
    const subject = new Subject<string>();
    (signalrService as any).userNotification$ = subject.asObservable();
    notificationService.getUserNotificationCount.and.returnValue(of(7));
    notificationService.getTop10UserNotification.and.returnValue(of([{ id: 'n1' }] as any));
    fixture = create();
    component = fixture.componentInstance;
    fixture.detectChanges();
    subject.next('u1');
    expect(component.notificationCount).toBe(7);
    expect(component.notificationUserList.length).toBe(1);
  });

  it('markAllAsReadNotification re-fetches notifications', () => {
    fixture = create();
    component = fixture.componentInstance;
    fixture.detectChanges();
    notificationService.markAllAsRead.and.returnValue(of({} as any));
    notificationService.getUserNotificationCount.and.returnValue(of(0));
    component.markAllAsReadNotification();
    expect(notificationService.markAllAsRead).toHaveBeenCalled();
    expect(component.notificationCount).toBe(0);
  });

  it('onChangeBusinssLocation delegates to security service', () => {
    fixture = create();
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.onChangeBusinssLocation('l9');
    expect(securityService.updateSelectedLocation).toHaveBeenCalledWith('l9');
  });

  it('mobileMenuSidebarOpen toggles the body class', () => {
    fixture = create();
    component = fixture.componentInstance;
    fixture.detectChanges();
    const target = document.createElement('div');
    const event = { target } as unknown as Event;
    component.mobileMenuSidebarOpen(event, 'sidebar-open');
    expect(document.body.classList.contains('sidebar-open')).toBeTrue();
    (target as HTMLElement).classList.add('sidebar-open');
    component.mobileMenuSidebarOpen(event, 'sidebar-open');
    expect(document.body.classList.contains('sidebar-open')).toBeFalse();
  });

  it('callSidemenuCollapse toggles collapsed state', () => {
    fixture = create();
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.callSidemenuCollapse();
    expect(document.body.classList.contains('side-closed')).toBeTrue();
    expect(localStorage.getItem('collapsed_menu')).toBe('true');
    expect(commonService.setSideMenuStatus).toHaveBeenCalledWith(true);
    component.callSidemenuCollapse();
    expect(document.body.classList.contains('side-closed')).toBeFalse();
    expect(localStorage.getItem('collapsed_menu')).toBe('false');
    expect(commonService.setSideMenuStatus).toHaveBeenCalledWith(false);
  });

  it('callFullscreen toggles fullscreen', () => {
    fixture = create();
    component = fixture.componentInstance;
    fixture.detectChanges();
    const requestSpy = spyOn(document.documentElement, 'requestFullscreen').and.returnValue(Promise.resolve());
    const exitSpy = spyOn(document, 'exitFullscreen').and.returnValue(Promise.resolve());
    component.callFullscreen();
    expect(requestSpy).toHaveBeenCalled();
    expect(component.isFullScreen).toBeTrue();
    component.callFullscreen();
    expect(exitSpy).toHaveBeenCalled();
    expect(component.isFullScreen).toBeFalse();
  });

  it('onNotificationClick marks unread notification read and navigates', () => {
    fixture = create();
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.notificationCount = 2;
    const notification = { id: 'n1', isRead: false, referenceId: 'r1' } as any;
    component.onNotificationClick(notification, '/reminder-detail');
    expect(notificationService.markAsReadNotification).toHaveBeenCalledWith('n1');
    expect(component.notificationCount).toBe(1);
    expect(notification.isRead).toBeTrue();
    expect(router.navigate).toHaveBeenCalledWith(['/reminder-detail', 'r1']);
  });

  it('onNotificationClick navigates without marking read notifications', () => {
    fixture = create();
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.notificationCount = 1;
    const notification = { id: 'n2', isRead: true, referenceId: 'r2' } as any;
    component.onNotificationClick(notification, '/reminder-detail');
    expect(notificationService.markAsReadNotification).not.toHaveBeenCalled();
    expect(component.notificationCount).toBe(1);
    expect(router.navigate).toHaveBeenCalledWith(['/reminder-detail', 'r2']);
  });

  it('onLogout logs out and navigates to login', () => {
    fixture = create();
    component = fixture.componentInstance;
    fixture.detectChanges();
    (component as any).appUserAuth = { id: 'u1' } as User;
    component.onLogout();
    expect(signalrService.logout).toHaveBeenCalledWith('u1');
    expect(securityService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(toastService.success).toHaveBeenCalled();
  });

  it('onMyProfile navigates to my-profile', () => {
    fixture = create();
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.onMyProfile();
    expect(router.navigate).toHaveBeenCalledWith(['/my-profile']);
  });

  it('openDailyReport opens the dialog', () => {
    fixture = create();
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.openDailyReport();
    expect(dialog.open).toHaveBeenCalled();
  });

  it('setNewLanguageRefresh stores old language and refreshes on success (leaves previous language active - quirk)', () => {
    fixture = create();
    component = fixture.componentInstance;
    fixture.detectChanges();
    translationService.getSelectedLanguage.and.returnValue('en');
    component.languages = [
      { code: 'en', active: true, name: 'English' } as any,
      { code: 'ar', active: false, name: 'Arabic' } as any,
    ];
    const arabic = { code: 'ar', active: false, name: 'Arabic' } as any;
    translationService.setLanguage.and.returnValue(of({}));
    component.setNewLanguageRefresh(arabic);
    expect(component.oldLang).toBe('en');
    expect(component.language).toBe(arabic);
    expect(component.languages.find((l) => l.code === 'ar')!.active).toBeTrue();
    expect(component.languages.find((l) => l.code === 'en')!.active).toBeTrue();
  });
});
