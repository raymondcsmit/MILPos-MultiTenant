import { TestBed, fakeAsync } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  function configure(): void {
    TestBed.configureTestingModule({ providers: [ThemeService] });
  }

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('defaults to the "default" theme', () => {
    configure();
    const service = TestBed.inject(ThemeService);
    expect(service.currentTheme()).toBe('default');
  });

  it('setTheme updates the currentTheme signal', () => {
    configure();
    const service = TestBed.inject(ThemeService);
    service.setTheme('theme-dark');
    expect(service.currentTheme()).toBe('theme-dark');
  });

  it('restores the saved theme from localStorage on construction', () => {
    localStorage.setItem('user-theme', 'theme-blue');
    configure();
    const service = TestBed.inject(ThemeService);
    expect(service.currentTheme()).toBe('theme-blue');
  });

  it('applies the theme class to document.body and persists it', fakeAsync(() => {
    configure();
    const service = TestBed.inject(ThemeService);
    service.setTheme('theme-dark');
    TestBed.flushEffects();
    expect(document.body.classList.contains('theme-dark')).toBe(true);
    expect(localStorage.getItem('user-theme')).toBe('theme-dark');
  }));

  it('removes stale theme- classes when the theme changes back to default', fakeAsync(() => {
    configure();
    const service = TestBed.inject(ThemeService);
    service.setTheme('theme-dark');
    TestBed.flushEffects();
    expect(document.body.classList.contains('theme-dark')).toBe(true);

    service.setTheme('default');
    TestBed.flushEffects();
    expect(document.body.classList.contains('theme-dark')).toBe(false);
  }));
});