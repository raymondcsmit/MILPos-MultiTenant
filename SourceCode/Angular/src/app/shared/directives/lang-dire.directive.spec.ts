import { ElementRef, Renderer2 } from '@angular/core';
import { LangDirDirective } from './lang-dire.directive';
import { TranslationService } from '@core/services/translation.service';

describe('LangDirDirective', () => {
  let elRef: ElementRef<any>;
  let renderer: jasmine.SpyObj<Renderer2>;
  const translationService = {} as unknown as TranslationService;

  beforeEach(() => {
    elRef = { nativeElement: { tagName: 'DIV' } } as ElementRef<any>;
    renderer = jasmine.createSpyObj('Renderer2', ['setAttribute']);
  });

  it('sets dir attribute to rtl on init', () => {
    const directive = new LangDirDirective(elRef, renderer, translationService);
    directive.ngOnInit();
    expect(renderer.setAttribute).toHaveBeenCalledWith(elRef.nativeElement, 'dir', 'rtl');
  });

  it('does not set attributes before init', () => {
    new LangDirDirective(elRef, renderer, translationService);
    expect(renderer.setAttribute).not.toHaveBeenCalled();
  });
});
