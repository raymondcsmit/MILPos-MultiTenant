import { TestBed } from '@angular/core/testing';

import {
  WINDOW,
  WindowRef,
  BrowserWindowRef,
  WINDOW_PROVIDERS,
  windowFactory,
} from './window.service';

describe('window.service', () => {
  it('WindowRef.nativeWindow throws by default', () => {
    const ref = new (class extends WindowRef {})();
    expect(() => ref.nativeWindow).toThrowError('Not implemented.');
  });

  it('BrowserWindowRef.nativeWindow returns the native window object', () => {
    expect(new BrowserWindowRef().nativeWindow).toBe(window);
  });

  it('windowFactory returns the native window on a browser platform', () => {
    const ref = new BrowserWindowRef();
    expect(windowFactory(ref, 'browser')).toBe(window);
  });

  it('windowFactory falls back to a plain Object on non-browser platforms', () => {
    const ref = new BrowserWindowRef();
    const fallback = windowFactory(ref, 'server');
    expect(fallback).not.toBe(window);
    expect(fallback).toEqual(jasmine.any(Object));
  });

  describe('WINDOW_PROVIDERS', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({ providers: [WINDOW_PROVIDERS] });
    });

    it('injects the native window through the WINDOW token', () => {
      expect(TestBed.inject(WINDOW)).toBe(window);
    });

    it('registers a WindowRef via BrowserWindowRef', () => {
      const ref = TestBed.inject(WindowRef);
      expect(ref).toBeInstanceOf(BrowserWindowRef);
      expect(ref.nativeWindow).toBe(window);
    });
  });
});