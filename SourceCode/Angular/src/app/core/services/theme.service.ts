import { Injectable, signal, effect } from '@angular/core';

export type WebsiteTheme = 'default' | 'theme-ocean' | 'theme-dark' | 'theme-crimson' | 'theme-sunset' | 'theme-forest' | 'theme-berry' | 'theme-royal' | 'theme-slate' | 'theme-sky';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  private readonly THEME_KEY = 'user-theme';
  
  // Use signal for reactive state
  currentTheme = signal<WebsiteTheme>('default');

  constructor() {
    this.loadSavedTheme();
    
    // Reactively update the DOM when the signal changes
    effect(() => {
      const theme = this.currentTheme();
      this.applyTheme(theme);
      localStorage.setItem(this.THEME_KEY, theme);
    });
  }

  setTheme(theme: WebsiteTheme) {
    this.currentTheme.set(theme);
  }

  private loadSavedTheme() {
    const saved = localStorage.getItem(this.THEME_KEY) as WebsiteTheme;
    if (saved) {
      this.currentTheme.set(saved);
    }
  }

  private applyTheme(theme: WebsiteTheme) {
    // Remove all known theme classes
    document.body.classList.remove(
      'theme-ocean', 'theme-dark', 'theme-crimson',
      'theme-sunset', 'theme-forest', 'theme-berry',
      'theme-royal', 'theme-slate', 'theme-sky'
    );
    
    // Add the new theme class (if not default)
    if (theme !== 'default') {
      document.body.classList.add(theme);
    }
  }
}
