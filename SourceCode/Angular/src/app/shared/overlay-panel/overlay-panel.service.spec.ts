import { TestBed } from '@angular/core/testing';
import { Component, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { Overlay, OverlayRef, OverlayConfig, GlobalPositionStrategy } from '@angular/cdk/overlay';
import { Subject } from 'rxjs';
import { BehaviorSubject } from 'rxjs';

import { OverlayPanel } from './overlay-panel.service';
import { OverlayPanelRef } from './overlay-panel-ref';
import { OVERLAY_PANEL_DATA } from './overlay-panel-data';
import { BreakpointsService } from '@core/services/breakpoints.service';
import { FullscreenOverlayScrollStrategy } from './fullscreen-overlay-scroll-strategy';

@Component({ template: 'panel-content' })
class PanelComponent {}

@Component({
  template: `<ng-template #tpl let-data>tpl-content</ng-template>`,
  standalone: true,
})
class HostComponent {
  @ViewChild('tpl', { static: true }) tpl!: TemplateRef<any>;
  constructor(public vcr: ViewContainerRef) {}
}

describe('OverlayPanel', () => {
  const CLOSE_SENTINEL = { __closeScrollStrategy: true };
  let service: OverlayPanel;
  let overlaySpy: jasmine.SpyObj<Overlay>;
  let fakeOverlayRef: jasmine.SpyObj<OverlayRef>;
  let backdropClick$: Subject<any>;
  let keydownEvents$: Subject<KeyboardEvent>;
  let breakpoints: { isMobile$: BehaviorSubject<boolean> };
  let capturedConfig: OverlayConfig | undefined;
  let globalStrategy: jasmine.SpyObj<GlobalPositionStrategy>;
  let closeScrollStrategySpy: jasmine.Spy;

  beforeEach(() => {
    capturedConfig = undefined;
    backdropClick$ = new Subject();
    keydownEvents$ = new Subject<KeyboardEvent>();

    fakeOverlayRef = jasmine.createSpyObj<OverlayRef>('OverlayRef', [
      'attach', 'backdropClick', 'keydownEvents', 'dispose', 'hasAttached', 'overlayElement', 'detachments',
    ]);
    fakeOverlayRef.attach.and.returnValue({} as any);
    fakeOverlayRef.backdropClick.and.returnValue(backdropClick$ as any);
    fakeOverlayRef.keydownEvents.and.returnValue(keydownEvents$ as any);

    globalStrategy = jasmine.createSpyObj<GlobalPositionStrategy>('GlobalPositionStrategy', [
      'centerHorizontally', 'centerVertically', 'top', 'bottom', 'left', 'right',
    ]);
    globalStrategy.centerHorizontally.and.returnValue(globalStrategy);
    globalStrategy.centerVertically.and.returnValue(globalStrategy);
    ['top', 'bottom', 'left', 'right'].forEach((k) => {
      (globalStrategy as any)[k].and.returnValue(globalStrategy);
    });

    overlaySpy = jasmine.createSpyObj<Overlay>('Overlay', ['create', 'position']);
    overlaySpy.create.and.callFake((cfg: OverlayConfig) => {
      capturedConfig = cfg;
      return fakeOverlayRef;
    });
    overlaySpy.position.and.returnValue({
      global: () => globalStrategy,
      flexibleConnectedTo: () =>
        jasmine.createSpyObj('FlexibleConnectedPositionStrategy', ['withPositions', 'withPush', 'withViewportMargin']),
    } as any);
    closeScrollStrategySpy = jasmine.createSpy('closeScrollStrategy').and.returnValue(CLOSE_SENTINEL as any);
    (overlaySpy as any).scrollStrategies = { close: closeScrollStrategySpy };

    breakpoints = { isMobile$: new BehaviorSubject(false) };

    TestBed.configureTestingModule({
      providers: [OverlayPanel, { provide: Overlay, useValue: overlaySpy }, { provide: BreakpointsService, useValue: breakpoints }],
    });
    service = TestBed.inject(OverlayPanel);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('documentVersionId emits values set via setDocumentVersionId', () => {
    let seen = '';
    service.documentVersionId.subscribe((v) => (seen = v));
    service.setDocumentVersionId('doc-1');
    expect(seen).toBe('doc-1');
  });

  it('isClosePanelClose$ emits values set via setIsClosePanelClose', () => {
    let seen = false;
    service.isClosePanelClose$.subscribe((v) => (seen = v));
    service.setIsClosePanelClose(true);
    expect(seen).toBe(true);
  });

  describe('open', () => {
    it('creates overlay with defaults, attaches component portal and returns ref', () => {
      const ref: OverlayPanelRef<PanelComponent> = service.open(PanelComponent, {
        position: 'center',
      });
      expect(capturedConfig).toBeDefined();
      expect(capturedConfig!.hasBackdrop).toBeTrue();
      expect(capturedConfig!.panelClass).toBe('overlay-panel');
      expect(capturedConfig!.disposeOnNavigation).toBeTrue();
      expect(fakeOverlayRef.attach).toHaveBeenCalled();
      expect(ref).toBeInstanceOf(OverlayPanelRef);
      expect(ref.componentRef).toBeDefined();
    });

    it('throws when no position is available', () => {
      expect(() => service.open(PanelComponent, {} as any)).toThrowError(
        'OverlayPanelPosition is required but was undefined.'
      );
    });

    it('applies width/height/maxHeight/maxWidth to the overlay config', () => {
      service.open(PanelComponent, { position: 'center', width: 400, height: 500, maxHeight: 600, maxWidth: 700 } as any);
      expect(capturedConfig!.width).toBe(400);
      expect(capturedConfig!.height).toBe(500);
      expect(capturedConfig!.maxHeight).toBe(600);
      expect(capturedConfig!.maxWidth).toBe(700);
    });

    it('centers globally for center position', () => {
      service.open(PanelComponent, { position: 'center' });
      expect(globalStrategy.centerHorizontally).toHaveBeenCalled();
      expect(globalStrategy.centerVertically).toHaveBeenCalled();
    });

    it('uses the provided custom positionStrategy untouched', () => {
      const custom = {} as any;
      service.open(PanelComponent, { position: 'center', positionStrategy: custom } as any);
      expect(capturedConfig!.positionStrategy).toBe(custom);
      expect(globalStrategy.centerHorizontally).not.toHaveBeenCalled();
    });

    it('applies global position object entries', () => {
      service.open(PanelComponent, { position: { top: '10px', left: '20px' } } as any);
      expect(globalStrategy.top).toHaveBeenCalledWith('10px');
      expect(globalStrategy.left).toHaveBeenCalledWith('20px');
    });

    it('uses mobilePosition when viewport is mobile', () => {
      breakpoints.isMobile$.next(true);
      service.open(PanelComponent, { position: { top: '10px' }, mobilePosition: { bottom: '0px' } } as any);
      expect(globalStrategy.bottom).toHaveBeenCalledWith('0px');
      expect(globalStrategy.top).not.toHaveBeenCalled();
    });

    it('uses FullscreenOverlayScrollStrategy when fullScreen is set', () => {
      service.open(PanelComponent, { position: 'center', fullScreen: true } as any);
      expect(capturedConfig!.scrollStrategy).toBeInstanceOf(FullscreenOverlayScrollStrategy);
    });

    it('uses close scrollStrategy when configured', () => {
      service.open(PanelComponent, { position: 'center', scrollStrategy: 'close' } as any);
      expect(closeScrollStrategySpy).toHaveBeenCalled();
      expect(capturedConfig!.scrollStrategy).toBe(CLOSE_SENTINEL as any);
    });

    it('closes the panel on backdrop click and Escape when closeOnBackdropClick', () => {
      const ref = service.open(PanelComponent, { position: 'center' });
      backdropClick$.next({});
      expect(fakeOverlayRef.dispose).toHaveBeenCalled();
      fakeOverlayRef.dispose.calls.reset();
      keydownEvents$.next({ key: 'Escape' } as KeyboardEvent);
      expect(fakeOverlayRef.dispose).toHaveBeenCalled();
      expect(ref).toBeDefined();
    });

    it('does not subscribe to backdrop/Escape when closeOnBackdropClick is false', () => {
      service.open(PanelComponent, { position: 'center', closeOnBackdropClick: false });
      backdropClick$.next({});
      keydownEvents$.next({ key: 'Escape' } as KeyboardEvent);
      expect(fakeOverlayRef.dispose).not.toHaveBeenCalled();
    });

    it('injects data through the panel injector', () => {
      service.open(PanelComponent, { position: 'center', data: { foo: 'bar' } });
      expect(fakeOverlayRef.attach).toHaveBeenCalled();
      expect(OVERLAY_PANEL_DATA).toBeDefined();
    });

    it('attaches a TemplatePortal when given a TemplateRef', () => {
      const fixture = TestBed.createComponent(HostComponent);
      const ref = service.open(fixture.componentInstance.tpl, {
        position: 'center',
        viewContainerRef: fixture.componentInstance.vcr,
        data: { x: 1 },
      });
      expect(fakeOverlayRef.attach).toHaveBeenCalled();
      expect(ref.componentRef).toBeDefined();
    });
  });
});
