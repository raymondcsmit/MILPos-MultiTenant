import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavigationEnd, Router, provideRouter } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Subject } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

import { SidebarComponent } from './sidebar.component';
import { MenuService } from '../services/menu.service';
import { MenuItem } from '../domain-classes/menu-item';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let menuService: jasmine.SpyObj<MenuService>;
  let breakpointSubject$: Subject<{ matches: boolean; breakpoints: { [key: string]: boolean } }>;
  let router: Router;
  let routerEvents: Subject<NavigationEnd>;
  let body: HTMLElement;

  const menuItem = (over: Partial<MenuItem>): MenuItem =>
    ({
      id: 'm1',
      title: '',
      path: '',
      icon: '',
      cssClass: '',
      order: 1,
      parentId: null,
      isActive: true,
      isVisible: true,
      children: [],
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      ...over,
    }) as MenuItem;

  const menuItems: MenuItem[] = [
    menuItem({
      path: '/product',
      title: 'PRODUCTS',
      icon: 'inventory',
      children: [menuItem({ path: '/product/list', title: 'PRODUCT_LIST' })],
    }),
    menuItem({ path: '/hidden', title: 'HIDDEN', isVisible: false }),
  ];

  function createFixture(): void {
    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    menuService = jasmine.createSpyObj<MenuService>('MenuService', ['loadUserMenu']);
    menuService.loadUserMenu.and.resolveTo(undefined);
    (menuService as any).visibleMenuItems = jasmine
      .createSpy('visibleMenuItems')
      .and.returnValue(menuItems.filter((i) => i.isVisible));

    breakpointSubject$ = new Subject();
    const breakpointObserver = {
      observe: () => breakpointSubject$.asObservable(),
    } as unknown as BreakpointObserver;

    routerEvents = new Subject<NavigationEnd>();

    TestBed.configureTestingModule({
      imports: [SidebarComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: MenuService, useValue: menuService },
        { provide: BreakpointObserver, useValue: breakpointObserver },
      ],
    });

    router = TestBed.inject(Router);
    Object.defineProperty(router, 'events', { value: routerEvents.asObservable(), configurable: true });
    body = document.body;
  });

  afterEach(() => {
    body.classList.remove('ls-closed', 'overlay-open', 'side-closed-hover', 'submenu-closed');
  });

  it('should create and map visible menu items from menu service', async () => {
    createFixture();
    await fixture.whenStable();
    expect(component).toBeTruthy();
    expect(menuService.loadUserMenu).toHaveBeenCalled();
    expect(component.sidebarItems.length).toBe(1);
    expect(component.sidebarItems[0].path).toBe('/product');
    expect(component.sidebarItems[0].title).toBe('PRODUCTS');
    expect(component.sidebarItems[0].icon).toBe('inventory');
    expect(component.sidebarItems[0].hasClaims).toEqual([]);
    expect(component.sidebarItems[0].submenu.length).toBe(1);
    expect(component.sidebarItems[0].submenu[0].title).toBe('PRODUCT_LIST');
  });

  it('should set menu height and width from window size', () => {
    createFixture();
    expect(component.listMaxHeight).toBe(String(window.innerHeight - component.headerHeight));
    expect(component.listMaxWidth).toBe('500px');
  });

  it('should remove overlay-open from body on NavigationEnd', () => {
    createFixture();
    body.classList.add('overlay-open');
    routerEvents.next(new NavigationEnd(1, '/product', '/product'));
    expect(body.classList.contains('overlay-open')).toBeFalse();
  });

  it('should close the menu and flag small screen when breakpoint matches', () => {
    createFixture();
    body.classList.remove('ls-closed', 'overlay-open');
    breakpointSubject$.next({ matches: true, breakpoints: {} });
    expect(component.isSmallScreen).toBeTrue();
    expect(body.classList.contains('ls-closed')).toBeTrue();
    expect(body.classList.contains('overlay-open')).toBeFalse();
  });

  it('should not flag small screen when breakpoint does not match', () => {
    createFixture();
    breakpointSubject$.next({ matches: false, breakpoints: {} });
    expect(component.isSmallScreen).toBeFalse();
  });

  it('should toggle active class on parent li when toggling a submenu', () => {
    createFixture();
    const li = document.createElement('li');
    const anchor = document.createElement('a');
    li.appendChild(anchor);
    fixture.nativeElement.appendChild(li);

    component.callToggleMenu({ target: anchor } as unknown as Event, 2);
    expect(li.classList.contains('active')).toBeTrue();

    component.callToggleMenu({ target: anchor } as unknown as Event, 2);
    expect(li.classList.contains('active')).toBeFalse();
  });

  it('should do nothing when toggling an item without children', () => {
    createFixture();
    const li = document.createElement('li');
    const anchor = document.createElement('a');
    li.appendChild(anchor);
    fixture.nativeElement.appendChild(li);

    component.callToggleMenu({ target: anchor } as unknown as Event, 0);
    expect(li.classList.contains('active')).toBeFalse();
  });

  it('should remove overlay-open when mousedown happens outside the sidebar', () => {
    createFixture();
    body.classList.add('overlay-open');
    body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(body.classList.contains('overlay-open')).toBeFalse();
  });

  it('should keep overlay-open when mousedown happens inside the sidebar', () => {
    createFixture();
    body.classList.add('overlay-open');
    component.elementRef.nativeElement.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(body.classList.contains('overlay-open')).toBeTrue();
  });

  it('should swap closed-menu classes on mouse hover in and out', () => {
    createFixture();
    body.classList.add('submenu-closed');
    component.mouseHover();
    expect(body.classList.contains('side-closed-hover')).toBeTrue();
    expect(body.classList.contains('submenu-closed')).toBeFalse();

    component.mouseOut();
    expect(body.classList.contains('side-closed-hover')).toBeFalse();
    expect(body.classList.contains('submenu-closed')).toBeTrue();
  });
});
