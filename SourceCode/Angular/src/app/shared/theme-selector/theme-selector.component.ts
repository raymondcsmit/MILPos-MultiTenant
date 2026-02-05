import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, WebsiteTheme } from '@core/services/theme.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-theme-selector',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './theme-selector.component.html',
  styles: [`
    .theme-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
      gap: 10px;
      padding: 10px;
    }
    .theme-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      border: 2px solid transparent;
      padding: 5px;
      border-radius: 8px;
      transition: all 0.2s;
    }
    .theme-btn:hover {
      background-color: #f0f0f0;
    }
    .theme-btn.active {
      border-color: var(--primary-500);
      background-color: var(--primary-50);
    }
    .color-swatch {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      margin-bottom: 5px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
  `]
})
export class ThemeSelectorComponent {

  themes: { id: WebsiteTheme, name: string, color: string }[] = [
    { id: 'default', name: 'Default (Cyan)', color: '#00bcd4' },
    { id: 'theme-ocean', name: 'Ocean', color: '#3f51b5' },
    { id: 'theme-dark', name: 'Dark Mode', color: '#303030' },
    { id: 'theme-crimson', name: 'Crimson', color: '#f44336' },
    { id: 'theme-sunset', name: 'Sunset', color: '#ff9800' },
    { id: 'theme-forest', name: 'Forest', color: '#009688' },
    { id: 'theme-berry', name: 'Berry', color: '#e91e63' },
    { id: 'theme-royal', name: 'Royal', color: '#673ab7' },
    { id: 'theme-slate', name: 'Slate', color: '#607d8b' },
    { id: 'theme-sky', name: 'Sky', color: '#03a9f4' }
  ];

  constructor(public themeService: ThemeService) {}

  setTheme(theme: WebsiteTheme) {
    this.themeService.setTheme(theme);
  }
}
