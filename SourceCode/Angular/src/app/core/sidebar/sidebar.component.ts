/* eslint-disable @typescript-eslint/no-unused-vars */
import { Router, NavigationEnd, RouterModule, RouterLink } from '@angular/router';
import { DOCUMENT, NgClass } from '@angular/common';
import {
  Component,
  Inject,
  ElementRef,
  OnInit,
  Renderer2,
  HostListener,
  OnDestroy,
} from '@angular/core';
import { ROUTES } from './menu-items';
import { MenuInfo } from './menu-info';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Subject, takeUntil } from 'rxjs';
import { MenuService } from '../services/menu.service';
import { MenuItem } from '../domain-classes/menu-item';
@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: true,
  imports: [
    RouterModule,
    TranslateModule,
    NgClass,
    RouterLink,
    MatIconModule,
    NgScrollbarModule
  ]
})
export class SidebarComponent implements OnInit, OnDestroy {
  public sidebarItems!: MenuInfo[];
  public innerHeight?: number;
  public bodyTag!: HTMLElement;
  listMaxHeight?: string;
  listMaxWidth?: string;
  headerHeight = 60;
  isSmallScreen = false;
  private destroy$ = new Subject<void>();
  constructor(
    @Inject(DOCUMENT) private document: Document,
    private renderer: Renderer2,
    public elementRef: ElementRef,
    private router: Router,
    private breakpointObserver: BreakpointObserver,
    private menuService: MenuService
  ) {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.renderer.removeClass(this.document.body, 'overlay-open');
      }
    });
  }
  @HostListener('document:mousedown', ['$event'])
  onGlobalClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.renderer.removeClass(this.document.body, 'overlay-open');
    }
  }
  callToggleMenu(event: Event, length: number) {
    if (length > 0) {
      const parentElement = (event.target as HTMLInputElement).closest('li');
      const activeClass = parentElement?.classList.contains('active');

      if (activeClass) {
        this.renderer.removeClass(parentElement, 'active');
      } else {
        this.renderer.addClass(parentElement, 'active');
      }
    }
  }
  ngOnInit() {
    this.menuService.loadUserMenu().then(() => {
        this.sidebarItems = this.mapMenuItems(this.menuService.visibleMenuItems());
    });
    this.bodyTag = this.document.body;
    this.initLeftSidebar();
    // programmatic subscription example
    this.breakpointObserver.observe([
      '(max-width: 599px)',
      '(min-width: 600px) and (max-width: 959px)'
    ]).pipe(takeUntil(this.destroy$)).subscribe(state => {
      if (state.matches) {
        this.setMenuHeight();
        this.checkStatuForResize();
        this.isSmallScreen = true
        if (!this.bodyTag.classList.contains('ls-closed')) {
          this.renderer.addClass(this.document.body, 'ls-closed');
        }
        this.renderer.removeClass(this.document.body, 'overlay-open');
      } else {
        this.isSmallScreen = false
        this.renderer.removeClass(this.document.body, 'ls-closed');
        this.renderer.removeClass(this.document.body, 'overlay-open');
      }
    });
  }

  mapMenuItems(items: MenuItem[]): MenuInfo[] {
      return items.map(item => ({
          path: item.path,
          title: item.title,
          icon: item.icon,
          class: item.cssClass,
          submenu: this.mapMenuItems(item.children),
          hasClaims: [] // Backend filters by role, so we don't need client-side claim check for visibility
      }));
  }
  initLeftSidebar() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _this = this;
    // Set menu height
    _this.setMenuHeight();
    _this.checkStatuForResize();
  }
  setMenuHeight() {
    this.innerHeight = window.innerHeight;
    const height = this.innerHeight - this.headerHeight;
    this.listMaxHeight = height + '';
    this.listMaxWidth = '500px';
  }
  isOpen() {
    return this.bodyTag.classList.contains('overlay-open');
  }
  checkStatuForResize() {
    if (window.innerWidth < 1025) {
      this.renderer.addClass(this.document.body, 'ls-closed');
      this.renderer.addClass(this.document.body, 'overlay-open');
    } else {
      this.renderer.removeClass(this.document.body, 'ls-closed');
      this.renderer.removeClass(this.document.body, 'overlay-open');
    }
    if (this.isSmallScreen) {
      if (!this.bodyTag.classList.contains('ls-closed')) {
        this.renderer.addClass(this.document.body, 'ls-closed');
      }
      this.renderer.removeClass(this.document.body, 'overlay-open');
    }
  }
  mouseHover() {
    const body = this.elementRef.nativeElement.closest('body');
    if (body.classList.contains('submenu-closed')) {
      this.renderer.addClass(this.document.body, 'side-closed-hover');
      this.renderer.removeClass(this.document.body, 'submenu-closed');
    }
  }
  mouseOut() {
    const body = this.elementRef.nativeElement.closest('body');
    if (body.classList.contains('side-closed-hover')) {
      this.renderer.removeClass(this.document.body, 'side-closed-hover');
      this.renderer.addClass(this.document.body, 'submenu-closed');
    }
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
