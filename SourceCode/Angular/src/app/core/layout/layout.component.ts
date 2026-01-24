import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  inject,
  Inject,
  Renderer2,
} from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '@core/header/header.component';
import { LoadingIndicatorComponent } from '@shared/loading-indicator/loading-indicator.component';
import { SidebarComponent } from '@core/sidebar/sidebar.component';
import { TranslationService } from '@core/services/translation.service';
import { filter, startWith } from 'rxjs';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
  standalone: true,
  imports: [
    LoadingIndicatorComponent,
    HeaderComponent,
    RouterModule,
    SidebarComponent
  ]
})
export class LayoutComponent implements AfterViewInit {
  direction!: string;
  isMenuCollapsed = false;
  router = inject(Router);
  route = inject(ActivatedRoute);
  hideSidebar = false;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private translationService: TranslationService,
    private renderer: Renderer2,
    private cdr: ChangeDetectorRef
  ) {
    this.getLangDir();
  }

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        startWith(null) // Trigger the initial check
      )
      .subscribe((event: NavigationEnd | null) => {
        const url = event ? event.urlAfterRedirects : this.router.url;
        this.hideSidebar = url.startsWith('/pos');
      });
  }

  getLangDir() {
    this.translationService.lanDir$.subscribe(
      (c: string) => {
        Promise.resolve().then(() => {
          this.direction = c;
          if (this.direction == 'rtl') {
            this.setRTLSettings();
          } else {
            this.setLTRSettings();
          }
          this.cdr.detectChanges();
        });
      }
    );
  }

  ngAfterViewInit(): void {
    if (localStorage.getItem('collapsed_menu')) {
      if (localStorage.getItem('collapsed_menu') === 'true') {
        this.renderer.addClass(this.document.body, 'side-closed');
        this.renderer.addClass(this.document.body, 'submenu-closed');
      }
    } else {
      if (this.isMenuCollapsed == true) {
        this.renderer.addClass(this.document.body, 'side-closed');
        this.renderer.addClass(this.document.body, 'submenu-closed');
        localStorage.setItem('collapsed_menu', 'true');
      } else {
        this.renderer.removeClass(this.document.body, 'side-closed');
        this.renderer.removeClass(this.document.body, 'submenu-closed');
        localStorage.setItem('collapsed_menu', 'false');
      }
    }
  }

  setRTLSettings() {
    document.getElementsByTagName('html')[0].setAttribute('dir', 'rtl');
    this.renderer.addClass(this.document.body, 'rtl');
    localStorage.setItem('isRtl', 'true');
  }

  setLTRSettings() {
    document.getElementsByTagName('html')[0].removeAttribute('dir');
    this.renderer.removeClass(this.document.body, 'rtl');
    localStorage.setItem('isRtl', 'false');
  }
}
