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

  themeGroups = [
    {
      name: '⚓ NAVY · GREY (Classic)',
      themes: [
        { id: 'theme-n1', name: 'N1 Navy', color: '#0A1E33' },
        { id: 'theme-n3', name: 'N3 Teal', color: '#0A2A32' },
        { id: 'theme-n6', name: 'N6 Gold', color: '#141D2E' },
        { id: 'theme-n8', name: 'N8 Coral', color: '#241E2C' },
        { id: 'theme-n12', name: 'N12 D.Pink', color: '#1D182F' }
      ]
    },
    {
      name: '⚡ BRIGHT · NEON (High Voltage)',
      themes: [
        { id: 'theme-b1', name: 'B1 Neon Punk', color: '#FF1493' },
        { id: 'theme-b2', name: 'B2 High Voltage', color: '#CCFF00' },
        { id: 'theme-b4', name: 'B4 Vaporwave', color: '#00FFFF' },
        { id: 'theme-b6', name: 'B6 Superhot', color: '#FF3300' },
        { id: 'theme-b15', name: 'B15 Blacklight', color: '#CC44FF' }
      ]
    },
    {
      name: '✨ PROFESSIONAL (Elevated)',
      themes: [
        { id: 'theme-p2', name: 'P2 Dynamic', color: '#0F2A44' },
        { id: 'theme-p5', name: 'P5 Biophilic', color: '#2C3E2F' },
        { id: 'theme-p9', name: 'P9 Prestige', color: '#0F3A47' },
        { id: 'theme-p11', name: 'P11 Warm', color: '#2C2220' },
        { id: 'theme-p14', name: 'P14 Poetic', color: '#341F2B' }
      ]
    },
    {
      name: 'Original Themes',
      themes: [
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
      ]
    }
  ];

  constructor(public themeService: ThemeService) {}

  setTheme(theme: WebsiteTheme) {
    this.themeService.setTheme(theme);
  }
}
