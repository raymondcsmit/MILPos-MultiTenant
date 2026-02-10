import { DOCUMENT, NgClass } from '@angular/common';
import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  Inject,
  HostListener,
  Renderer2,
} from '@angular/core';
import { ActivatedRoute, NavigationEnd, NavigationStart, Router, RouterLink, RouterModule } from '@angular/router';
import { ReminderScheduler } from '@core/domain-classes/reminder-scheduler';
import { SecurityService } from '@core/security/security.service';
import { CommonService } from '@core/services/common.service';
import { environment } from '@environments/environment';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { filter } from 'rxjs/operators';
import { LanguageFlag } from './languages';
import { User } from '@core/domain-classes/user';
import { WINDOW, WINDOW_PROVIDERS } from '@core/services/window.service';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { SignalrService } from '@core/services/signalr.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { BaseComponent } from '../../base.component';
import { NotificationService } from '../../notification/notification.service';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { DateAgoPipe } from '@shared/pipes/date-ago.pipe';
import { FormsModule } from '@angular/forms';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { ToastrService } from '@core/services/toastr.service';
import { DailyReportSummary } from '../../accounting/reports/daily-report-summary/daily-report-summary';
import { MatDialog } from '@angular/material/dialog';
import { CalculatorComponent } from "../../calculator/calculator.component";
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { BreakpointsService } from '@core/services/breakpoints.service';
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [
    NgClass,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatSelectModule,
    TranslateModule,
    UTCToLocalTime,
    HasClaimDirective,
    RouterModule,
    DateAgoPipe,
    FormsModule,
    NgScrollbarModule,
    CalculatorComponent,
    RouterLink,
    MatTooltipModule,
    MatBadgeModule
  ],
  providers: [
    WINDOW_PROVIDERS
  ]
})
export class HeaderComponent extends BaseComponent implements OnInit {
  @ViewChild('selectElem', { static: true }) el!: ElementRef;
  @ViewChild('navbarHeader', { static: true }) navbarHeader!: ElementRef;
  navbarOpen = false;
  appUserAuth: User | null = null;
  language!: LanguageFlag | undefined;
  notificationCount: number = 0;
  notificationUserList: ReminderScheduler[] = [];
  languages: LanguageFlag[] = [];
  profilePath = '';
  logoImage = '';
  oldLang: string = '';
  refereshReminderTimeInMinute = 10;
  docElement?: HTMLElement;
  isNavbarCollapsed = true;
  isNavbarShow = true;
  isOpenSidebar?: boolean;
  isFullScreen = false;
  direction!: string;
  locations: BusinessLocation[] = [];
  selectedLocation!: string;
  hasOnlyPOSPermission = false;
  isMobile: boolean = false;
  isTablet: boolean = false;
  isPosPage: boolean = false;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private renderer: Renderer2,
    @Inject(WINDOW) private window: Window,
    private router: Router,
    private securityService: SecurityService,
    private commonService: CommonService,
    public translate: TranslateService,
    private notificationService: NotificationService,
    private signalrService: SignalrService,
    private toastService: ToastrService,
    private dialog: MatDialog,
    private breakpointsService: BreakpointsService,
    private route: ActivatedRoute
  ) {
    super();
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.window.scrollY ||
      this.document.documentElement.scrollTop ||
      this.document.body.scrollTop ||
      0;
  }

  ngOnInit(): void {
    this.breakpointsService.isMobile$.subscribe(c => this.isMobile = c);
    this.breakpointsService.isTablet$.subscribe(c => this.isTablet = c);
    this.docElement = document.documentElement;
    this.sidebarMenuStatus();
    this.setTopLogAndName();
    this.getUserNotification();
    this.companyProfileSubscription();
    this.getLangDir();
    this.routerNavigate();
    this.hideOrShowBaseOnCurrentUrl();
    this.getBusinessLocations();
    this.checkPOSPermission();
    const currentRoute = this.route.snapshot.routeConfig?.path ?? '';
    if (currentRoute.indexOf('pos') > -1) {
      this.isPosPage = true;
    }

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        if (event.url.indexOf('pos') > -1) {
          if (this.navbarHeader) {
            this.renderer.addClass(this.navbarHeader.nativeElement, 'hidden-navbar');
          }
          this.isPosPage = true;
        }
        else {
          if (this.navbarHeader) {
            this.renderer.removeClass(this.navbarHeader.nativeElement, 'hidden-navbar');
          }
          this.isPosPage = false;
        }
      }
    });

  }

  checkPOSPermission() {
    this.hasOnlyPOSPermission = this.securityService.isPOSPermissionOnly;
  }

  get isSuperAdmin(): boolean {
    const roles = this.securityService.Token && this.securityService.Token['role'];
    if (Array.isArray(roles)) {
      return roles.includes('Super Admin');
    }
    return roles === 'Super Admin';
  }

  // getLangDir() {
  //   this.translationService.lanDir$.subscribe((c: string) => {
  //     this.direction = c;
  //   });
  // }

  getBusinessLocations() {
    this.commonService.getLocationsForCurrentUser().subscribe((locationResponse) => {
      this.locations = locationResponse.locations;
      this.selectedLocation = locationResponse.selectedLocation;
    });
  }

  onChangeBusinssLocation(locationId: string) {
    this.securityService.updateSelectedLocation(locationId);
  }

  sidebarMenuStatus() {
    this.commonService.sideMenuStatus$.subscribe((status) => {
      this.isOpenSidebar = status;
    });
  }

  mobileMenuSidebarOpen(event: Event, className: string) {
    const hasClass = (event.target as HTMLInputElement).classList.contains(
      className
    );
    if (hasClass) {
      this.renderer.removeClass(this.document.body, className);
    } else {
      this.renderer.addClass(this.document.body, className);
    }
  }

  callSidemenuCollapse() {
    const hasClass = this.document.body.classList.contains('side-closed');
    if (hasClass) {
      this.commonService.setSideMenuStatus(false);
      this.renderer.removeClass(this.document.body, 'side-closed');
      this.renderer.removeClass(this.document.body, 'submenu-closed');
      localStorage.setItem('collapsed_menu', 'false');
    } else {
      this.renderer.addClass(this.document.body, 'side-closed');
      this.renderer.addClass(this.document.body, 'submenu-closed');
      localStorage.setItem('collapsed_menu', 'true');
      this.commonService.setSideMenuStatus(true);
    }
  }

  markAllAsReadNotification() {
    this.sub$.sink = this.notificationService.markAllAsRead().subscribe(() => {
      this.getUserNotification();
    });
  }

  callFullscreen() {
    if (!this.isFullScreen) {
      if (this.docElement?.requestFullscreen != null) {
        this.docElement?.requestFullscreen();
      }
    } else {
      document.exitFullscreen();
    }
    this.isFullScreen = !this.isFullScreen;
  }

  routerNavigate() {
    const url = this.router.url;
    if (url.indexOf('pos') > -1) {
      this.renderer.addClass(this.document.body, 'pos-page');
      if (this.navbarHeader) {
        this.renderer.addClass(this.navbarHeader.nativeElement, 'hidden-navbar');
      }
    } else {
      this.renderer.removeClass(this.document.body, 'pos-page');
      if (this.navbarHeader) {
        this.renderer.removeClass(this.navbarHeader.nativeElement, 'hidden-navbar');
      }
    }
    this.sub$.sink = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        if (event.url.indexOf('pos') > -1) {
          this.renderer.addClass(this.document.body, 'pos-page');
          if (this.navbarHeader) {
            this.renderer.setStyle(this.navbarHeader.nativeElement, 'display', 'none !important');
          }
        } else {
          this.renderer.removeClass(this.document.body, 'pos-page');
          if (this.navbarHeader) {
            this.renderer.setStyle(this.navbarHeader.nativeElement, 'display', 'block');
          }
        }
      });
  }

  hideOrShowBaseOnCurrentUrl() {
    if (this.router.url.indexOf('pos') > -1) {
      this.renderer.addClass(this.document.body, 'pos-page');
    } else {
      this.renderer.removeClass(this.document.body, 'pos-page');
    }
  }

  companyProfileSubscription() {
    this.securityService.companyProfile.subscribe((profile) => {
      if (profile) {
        this.logoImage = profile.logoUrl ?? '';
        this.languages = profile.languages ?? [];
        this.setDefaultLanguage();
      }
    });
  }

  getUserNotification() {
    this.sub$.sink =
      this.signalrService.userNotification$.subscribe(() => {
        this.getUserNotificationCount();
        this.getNotificationList();
      });
  }

  getUserNotificationCount() {
    this.sub$.sink = this.notificationService
      .getUserNotificationCount()
      .subscribe((c) => {
        this.notificationCount = c;
      });
  }

  getNotificationList() {
    this.sub$.sink = this.notificationService
      .getTop10UserNotification()
      .subscribe((c) => {
        this.notificationUserList = c;
      });
  }

  setDefaultLanguage() {
    const lang = this.translationService.getSelectedLanguage();
    this.setLanguageWithRefresh(lang ?? 'en');
  }

  setLanguageWithRefresh(code: string) {
    this.language = this.languages.find((c) => c.code == code);
    this.languages.forEach((language: LanguageFlag) => {
      if (language.code === code) {
        language.active = true;
      } else {
        language.active = false;
      }
    });
    if (this.language)
      this.translationService.setLanguage(this.language);
  }

  setLanguageWithRefreshNew(languageflag: LanguageFlag) {
    this.languages.forEach((language: LanguageFlag) => {
      if (language.code === languageflag.code) {
        language.active = true;
        this.language = languageflag;
      } else {
        languageflag.active = false;
      }
    });
    this.translationService.setLanguage(languageflag);
  }

  setNewLanguageRefresh(language: LanguageFlag) {
    this.oldLang = this.translationService.getSelectedLanguage();
    this.sub$.sink = this.translationService
      .setLanguage(language)
      .subscribe((response: any) => {
        if (response)
          this.setLanguageWithRefreshNew(language);
      });
  }

  setTopLogAndName() {
    this.sub$.sink = this.securityService.securityObject$.subscribe((c: User | null) => {
      if (c) {
        this.appUserAuth = c;
        if (this.appUserAuth.profilePhoto) {
          this.profilePath = environment.apiUrl + this.appUserAuth.profilePhoto;
        } else {
          this.profilePath = '';
        }
      }
    });
  }

  onLogout(): void {
    this.signalrService.logout(this.appUserAuth?.id ?? '');
    this.securityService.logout();
    this.router.navigate(['/login']);
    this.toastService.success(this.translationService.getValue('LOGOUT_SUCCESS'));
  }

  onMyProfile(): void {
    this.router.navigate(['/my-profile']);
  }

  onNotificationClick(notification: ReminderScheduler, path: string) {
    if (!notification.isRead) {
      this.notificationService
        .markAsReadNotification(notification.id)
        .subscribe((d) => { });
      this.notificationCount = this.notificationCount - 1;
      notification.isRead = true;
    }
    this.router.navigate([path, notification.referenceId]);
  }

  openDailyReport() {
    this.dialog.open(DailyReportSummary, {
      maxWidth: '98vw',
      maxHeight: '99vh',
    });
  }
}
