import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { MenuService } from './menu.service';
import { MenuItem } from '@core/domain-classes/menu-item';

describe('MenuService', () => {
  let service: MenuService;
  let httpMock: HttpTestingController;

  const menu: MenuItem[] = [
    {
      id: '1',
      title: 'Dashboard',
      path: '/dashboard',
      icon: '',
      cssClass: '',
      order: 1,
      parentId: null,
      isActive: true,
      isVisible: true,
      children: [],
      canView: true,
      canCreate: false,
      canEdit: false,
      canDelete: false,
    },
    {
      id: '2',
      title: 'Hidden',
      path: '/hidden',
      icon: '',
      cssClass: '',
      order: 2,
      parentId: null,
      isActive: true,
      isVisible: false,
      children: [],
      canView: true,
      canCreate: false,
      canEdit: false,
      canDelete: false,
    },
  ];

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), MenuService],
    });
    service = TestBed.inject(MenuService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    localStorage.clear();
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('loadUserMenu hydrates from localStorage without hitting the network', async () => {
    localStorage.setItem('userMenus', JSON.stringify(menu));
    await service.loadUserMenu();
    expect(service.menuItems()).toEqual(menu);
  });

  it('loadUserMenu fetches and caches when nothing is saved', async () => {
    const load = service.loadUserMenu();
    const req = expectUrl('GET', 'api/MenuItems/user-menu');
    req.flush(menu);
    await load;
    expect(service.menuItems()).toEqual(menu);
    expect(localStorage.getItem('userMenus')).toBe(JSON.stringify(menu));
  });

  it('refreshUserMenu GETs api/MenuItems/user-menu and sets the signal + cache', async () => {
    const refresh = service.refreshUserMenu();
    const req = expectUrl('GET', 'api/MenuItems/user-menu');
    req.flush(menu);
    await refresh;
    expect(service.menuItems()).toEqual(menu);
    expect(localStorage.getItem('userMenus')).toBe(JSON.stringify(menu));
  });

  it('visibleMenuItems filters out non-visible items', async () => {
    localStorage.setItem('userMenus', JSON.stringify(menu));
    await service.loadUserMenu();
    expect(service.visibleMenuItems()).toEqual([menu[0]]);
  });

  it('refreshUserMenu swallows failures and leaves the signal empty', async () => {
    spyOn(console, 'error');
    const refresh = service.refreshUserMenu();
    const req = expectUrl('GET', 'api/MenuItems/user-menu');
    req.flush({}, { status: 500, statusText: 'boom' });
    await refresh;
    expect(service.menuItems()).toEqual([]);
  });

  it('getMenuItems GETs api/MenuItems', () => {
    let result: MenuItem[] | undefined;
    service.getMenuItems().subscribe((r) => (result = r));
    const req = expectUrl('GET', 'api/MenuItems');
    req.flush(menu);
    expect(result).toEqual(menu);
  });

  it('addMenuItem POSTs api/MenuItems with the item body', () => {
    service.addMenuItem(menu[0]).subscribe();
    const req = expectUrl('POST', 'api/MenuItems');
    expect(req.request.body).toBe(menu[0]);
    req.flush(menu[0]);
  });

  it('updateMenuItem PUTs api/MenuItems/{id} with the item body', () => {
    service.updateMenuItem('1', menu[0]).subscribe();
    const req = expectUrl('PUT', 'api/MenuItems/1');
    expect(req.request.body).toBe(menu[0]);
    req.flush(menu[0]);
  });

  it('deleteMenuItem DELETEs api/MenuItems/{id}', () => {
    service.deleteMenuItem('1').subscribe();
    expectUrl('DELETE', 'api/MenuItems/1').flush(true);
  });
});