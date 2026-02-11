import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MenuItem } from '../domain-classes/menu-item';
import { firstValueFrom } from 'rxjs';
import { ApiEndpoints } from '../constants/api-endpoints';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly _menuItems = signal<MenuItem[]>([]);
  
  public readonly menuItems = this._menuItems.asReadonly();
  public readonly visibleMenuItems = computed(() => 
    this._menuItems().filter(item => item.isVisible)
  );

  constructor(private http: HttpClient) {}

  async loadUserMenu() {
    const savedMenus = localStorage.getItem('userMenus');
    if (savedMenus) {
        this._menuItems.set(JSON.parse(savedMenus));
    } else {
        await this.refreshUserMenu();
    }
  }

  async refreshUserMenu() {
    try {
        const menu = await firstValueFrom(this.http.get<MenuItem[]>(ApiEndpoints.MenuItems.UserMenu));
        this._menuItems.set(menu);
        localStorage.setItem('userMenus', JSON.stringify(menu));
    } catch (e) {
        console.error('Failed to load menu', e);
    }
  }

  getMenuItems() {
    return this.http.get<MenuItem[]>(ApiEndpoints.MenuItems.GetAll);
  }

  addMenuItem(menuItem: MenuItem) {
    return this.http.post<MenuItem>(ApiEndpoints.MenuItems.Create, menuItem);
  }

  updateMenuItem(id: string, menuItem: MenuItem) {
    return this.http.put<MenuItem>(`${ApiEndpoints.MenuItems.Update}/${id}`, menuItem);
  }

  deleteMenuItem(id: string) {
    return this.http.delete<boolean>(`${ApiEndpoints.MenuItems.Delete}/${id}`);
  }
}
