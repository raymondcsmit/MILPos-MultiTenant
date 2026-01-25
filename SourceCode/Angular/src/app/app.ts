import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { BaseComponent } from './base.component';
import { SecurityService } from '@core/security/security.service';
import { TranslateService } from '@ngx-translate/core';
import { Title } from '@angular/platform-browser';
import { SignalrService } from '@core/services/signalr.service';
import { OnlineUser } from '@core/domain-classes/online-user';
import { User } from '@core/domain-classes/user';
import { LoadingProgressService } from '@shared/loading-indicator/loading-progress-service';
import { LoadingIndicatorComponent } from '@shared/loading-indicator/loading-indicator.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoadingIndicatorComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App extends BaseComponent implements OnInit {
  constructor(
    private securityService: SecurityService,
    public translate: TranslateService,
    private route: ActivatedRoute,
    private titleService: Title,
    private signalrService: SignalrService,
    private loadingService: LoadingProgressService,
    router: Router) {
    super();
    this.getLangDir();
    this.setProfile();
    this.companyProfileSubscription();
    this.setCurrentLang();
    router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.loadingService.setLoadingFlag(true);
      }
      if ((event instanceof NavigationError || event instanceof NavigationEnd || event instanceof NavigationCancel)) {
        this.loadingService.setLoadingFlag(false);
      }
    });
  }

  ngOnInit(): void {
    this.getAuthObj();
    this.signalrService.startConnection().then((resolve) => {
      if (resolve) {
        this.signalrService.handleMessage();
      }
    });
  }

  getAuthObj() {
    this.sub$.sink = this.securityService.securityObject$.subscribe(
      (c: User | null) => {
        if (c) {
          const online: OnlineUser = {
            email: c.email,
            id: c.id ?? '',
            connectionId: this.signalrService.connectionId,
          };
          this.signalrService.addUser(online);
        }
      }
    );
  }

  setProfile() {
    this.route.data.subscribe((data: any) => {
      if (data.profile) {
        this.securityService.updateProfile(data.profile);
      }
    });
  }

  companyProfileSubscription() {
    this.securityService.companyProfile.subscribe((profile) => {
      if (profile) {
        this.titleService.setTitle(profile.title);
      }
    });
  }

  setCurrentLang() {
    const lang = localStorage.getItem('language') ?? 'en';
    this.translate.use(lang);
  }
}
