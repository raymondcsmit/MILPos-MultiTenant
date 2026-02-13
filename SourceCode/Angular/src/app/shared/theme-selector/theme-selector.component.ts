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
      name: '⚓ NAVY · GREY',
      themes: [
        { id: 'theme-n1', name: 'N1 Navy', color: '#0A1E33' },
        { id: 'theme-n2', name: 'N2 Rose', color: '#1E1A2E' },
        { id: 'theme-n3', name: 'N3 Teal', color: '#0A2A32' },
        { id: 'theme-n4', name: 'N4 Burgundy', color: '#221A24' },
        { id: 'theme-n5', name: 'N5 Olive', color: '#1E2A1E' },
        { id: 'theme-n6', name: 'N6 Gold', color: '#141D2E' },
        { id: 'theme-n7', name: 'N7 Lavender', color: '#1D1A33' },
        { id: 'theme-n8', name: 'N8 Coral', color: '#241E2C' },
        { id: 'theme-n9', name: 'N9 Slate', color: '#13223B' },
        { id: 'theme-n10', name: 'N10 Emerald', color: '#0A1E26' },
        { id: 'theme-n11', name: 'N11 Taupe', color: '#1E1E28' },
        { id: 'theme-n12', name: 'N12 D.Pink', color: '#1D182F' },
        { id: 'theme-n13', name: 'N13 Mustard', color: '#191E2E' },
        { id: 'theme-n14', name: 'N14 Terracotta', color: '#261E24' },
        { id: 'theme-n15', name: 'N15 Cyan', color: '#081E38' }
      ]
    },
    {
      name: '⚡ BRIGHT · NEON',
      themes: [
        { id: 'theme-b1', name: 'B1 Neon Punk', color: '#FF1493' },
        { id: 'theme-b2', name: 'B2 High Voltage', color: '#CCFF00' },
        { id: 'theme-b3', name: 'B3 Sunset Pop', color: '#FF5500' },
        { id: 'theme-b4', name: 'B4 Vaporwave', color: '#00FFFF' },
        { id: 'theme-b5', name: 'B5 Psychedelic', color: '#AA00FF' },
        { id: 'theme-b6', name: 'B6 Superhot', color: '#FF3300' },
        { id: 'theme-b7', name: 'B7 Electric Royal', color: '#FFDD00' },
        { id: 'theme-b8', name: 'B8 Tropical', color: '#00FFAA' },
        { id: 'theme-b9', name: 'B9 Glam Rock', color: '#FF44CC' },
        { id: 'theme-b10', name: 'B10 90s Racer', color: '#0FF0F0' },
        { id: 'theme-b11', name: 'B11 Barbiecore', color: '#FF69B4' },
        { id: 'theme-b12', name: 'B12 Mermaid', color: '#00FFCC' },
        { id: 'theme-b13', name: 'B13 Laser Tag', color: '#FF0040' },
        { id: 'theme-b14', name: 'B14 Radical', color: '#AAFF00' },
        { id: 'theme-b15', name: 'B15 Blacklight', color: '#CC44FF' }
      ]
    },
    {
      name: '✨ PROFESSIONAL · ELEVATED',
      themes: [
        { id: 'theme-p1', name: 'P1 Conscious', color: '#2C3E4E' },
        { id: 'theme-p2', name: 'P2 Dynamic', color: '#0F2A44' },
        { id: 'theme-p3', name: 'P3 Artisanal', color: '#2D1B34' },
        { id: 'theme-p4', name: 'P4 Terracotta', color: '#2E3B4E' },
        { id: 'theme-p5', name: 'P5 Biophilic', color: '#2C3E2F' },
        { id: 'theme-p6', name: 'P6 Expressive', color: '#1E2B4F' },
        { id: 'theme-p7', name: 'P7 Electric Calm', color: '#1F2937' },
        { id: 'theme-p8', name: 'P8 Refined', color: '#35202E' },
        { id: 'theme-p9', name: 'P9 Prestige', color: '#0F3A47' },
        { id: 'theme-p10', name: 'P10 Future', color: '#282844' },
        { id: 'theme-p11', name: 'P11 Warm', color: '#2C2220' },
        { id: 'theme-p12', name: 'P12 Industrial', color: '#2B2F40' },
        { id: 'theme-p13', name: 'P13 Nordic', color: '#1E3A3F' },
        { id: 'theme-p14', name: 'P14 Poetic', color: '#341F2B' },
        { id: 'theme-p15', name: 'P15 Fresh', color: '#13293D' }
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
