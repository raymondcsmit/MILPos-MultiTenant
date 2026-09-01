import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { TranslateService } from '@ngx-translate/core';
import { LanguageFlag } from '@core/header/languages';

import { TranslationService } from './translation.service';

describe('TranslationService', () => {
  let service: TranslationService;
  let translate: jasmine.SpyObj<TranslateService>;

  const en: LanguageFlag = { code: 'en', name: 'English', imageUrl: 'en.svg', isrtl: false };
  const ar: LanguageFlag = { code: 'ar', name: 'Arabic', imageUrl: 'ar.svg', isrtl: true };

  beforeEach(() => {
    translate = jasmine.createSpyObj<TranslateService>('TranslateService', [
      'setTranslation',
      'addLangs',
      'use',
      'getDefaultLang',
      'instant',
    ]);
    translate.getDefaultLang.and.returnValue('en');
    translate.use.and.returnValue(of('en' as any));
    localStorage.removeItem('language');
    TestBed.configureTestingModule({
      providers: [TranslationService, { provide: TranslateService, useValue: translate }],
    });
    service = TestBed.inject(TranslationService);
  });

  afterEach(() => {
    localStorage.removeItem('language');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('loadTranslations appends each locale via setTranslation and registers the lang ids', () => {
    service.loadTranslations(
      { lang: 'en', data: { menu: 'Menu' } },
      { lang: 'ar', data: { menu: 'Menu' } }
    );
    expect(translate.setTranslation).toHaveBeenCalledWith('en', { menu: 'Menu' } as any, true);
    expect(translate.setTranslation).toHaveBeenCalledWith('ar', { menu: 'Menu' } as any, true);
    expect(translate.addLangs).toHaveBeenCalledWith(['en', 'ar']);
  });

  describe('setLanguage', () => {
    it('persists the lang code and returns the translate.use observable', () => {
      translate.use.and.returnValue(of('ar' as any));
      let used: string | undefined;
      service.setLanguage(ar).subscribe((l) => (used = l));
      expect(localStorage.getItem('language')).toBe('ar');
      expect(translate.use).toHaveBeenCalledWith('ar');
      expect(used).toBe('ar');
    });

    it('flips lanDir to rtl for rtl languages and ltr otherwise', () => {
      translate.use.and.returnValue(of('ar' as any));
      service.setLanguage(ar).subscribe();
      let dir: string | undefined;
      service.lanDir$.subscribe((d) => (dir = d));
      expect(dir).toBe('rtl');

      service.setLanguage(en).subscribe();
      service.lanDir$.subscribe((d) => (dir = d));
      expect(dir).toBe('ltr');
    });

    it('emits null without touching localStorage or translate when lang is null', () => {
      let emitted: any = 'unset';
      service.setLanguage(null as any).subscribe((v) => (emitted = v));
      expect(emitted).toBeNull();
      expect(localStorage.getItem('language')).toBeNull();
      expect(translate.use).not.toHaveBeenCalled();
    });
  });

  it('removeLanguage deletes the persisted lang code', () => {
    localStorage.setItem('language', 'ar');
    service.removeLanguage();
    expect(localStorage.getItem('language')).toBeNull();
  });

  it('getSelectedLanguage returns the persisted lang code', () => {
    localStorage.setItem('language', 'fr');
    expect(service.getSelectedLanguage()).toBe('fr');
  });

  it('getSelectedLanguage falls back to the default lang when nothing is persisted', () => {
    expect(service.getSelectedLanguage()).toBe('en');
  });

  it('getValue delegates to translate.instant', () => {
    translate.instant.and.returnValue('Translated');
    expect(service.getValue('menu.dashboard')).toBe('Translated');
    expect(translate.instant).toHaveBeenCalledWith('menu.dashboard');
  });

  it('lanDir$ starts at ltr', () => {
    let dir: string | undefined;
    service.lanDir$.subscribe((d) => (dir = d));
    expect(dir).toBe('ltr');
  });
});