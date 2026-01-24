import {
  ElementRef,
  Injectable,
  Injector,
  TemplateRef,
  inject,
  computed,
} from '@angular/core';
import {
  ConnectedPosition,
  Overlay,
  OverlayConfig,
  PositionStrategy,
  ScrollStrategy
} from '@angular/cdk/overlay';
import {
  ComponentPortal,
  ComponentType,
  TemplatePortal
} from '@angular/cdk/portal';
import { OverlayPanelRef } from './overlay-panel-ref';
import { OVERLAY_PANEL_DATA } from './overlay-panel-data';
import { OverlayPanelConfig, OverlayPanelPosition } from './overlay-panel-config';
import { FullscreenOverlayScrollStrategy } from './fullscreen-overlay-scroll-strategy';
import { BreakpointsService } from '@core/services/breakpoints.service';
import { filter } from 'rxjs/operators';
import { Observable, Subject } from 'rxjs';

const DEFAULT_CONFIG: Partial<OverlayPanelConfig> = {
  hasBackdrop: true,
  closeOnBackdropClick: true,
  panelClass: 'overlay-panel',
};

@Injectable({
  providedIn: 'root'
})
export class OverlayPanel {
  private overlay = inject(Overlay);
  private injector = inject(Injector);
  private breakpoints = inject(BreakpointsService);


  private isClose$: Subject<boolean> = new Subject<boolean>();

  private documentVersionId$: Subject<string> = new Subject<string>();

  setDocumentVersionId(value: string) {
    this.documentVersionId$.next(value);
  }

  public get documentVersionId(): Observable<string> {
    return this.documentVersionId$.asObservable();
  }


  setIsClosePanelClose(value: boolean) {
    this.isClose$.next(value);
  }

  public get isClosePanelClose$(): Observable<boolean> {
    return this.isClose$.asObservable();
  }

  public open<T>(
    cmp: ComponentType<T> | TemplateRef<any>,
    userConfig: OverlayPanelConfig
  ): OverlayPanelRef<T> {
    const config: OverlayPanelConfig = {
      ...DEFAULT_CONFIG,
      ...userConfig
    };

    const cdkConfig: OverlayConfig = {
      positionStrategy: this.getPositionStrategy(config),
      hasBackdrop: config.hasBackdrop,
      panelClass: config.panelClass,
      backdropClass: config.backdropClass,
      scrollStrategy: this.getScrollStrategy(config),
      disposeOnNavigation: true
    };

    if (config.width) cdkConfig.width = config.width;
    if (config.height) cdkConfig.height = config.height;
    if (config.maxHeight) cdkConfig.maxHeight = config.maxHeight;
    if (config.maxWidth) cdkConfig.maxWidth = config.maxWidth;

    const overlayRef = this.overlay.create(cdkConfig);
    const overlayPanelRef = new OverlayPanelRef<T>(overlayRef);

    const portal = cmp instanceof TemplateRef
      ? new TemplatePortal(cmp, config.viewContainerRef!, config.data)
      : new ComponentPortal(cmp, config.viewContainerRef, this.createInjector(config, overlayPanelRef));

    overlayPanelRef.componentRef = overlayRef.attach(portal);

    if (config.closeOnBackdropClick) {
      overlayRef.backdropClick().subscribe(() => overlayPanelRef.close());
      overlayRef.keydownEvents()
        .pipe(filter(event => event.key === 'Escape')) // ⬅️ Updated from deprecated ESCAPE constant
        .subscribe(() => overlayPanelRef.close());
    }

    return overlayPanelRef;
  }

  private getScrollStrategy(config: OverlayPanelConfig): ScrollStrategy | undefined {
    if (config.fullScreen) {
      return new FullscreenOverlayScrollStrategy(); // Custom scroll strategy class
    } else if (config.scrollStrategy === 'close') {
      return this.overlay.scrollStrategies.close();
    } else {
      return undefined;
    }
  }

  private createInjector(config: OverlayPanelConfig, dialogRef: OverlayPanelRef<any>): Injector {
    return Injector.create({
      providers: [
        { provide: OverlayPanelRef, useValue: dialogRef },
        { provide: OVERLAY_PANEL_DATA, useValue: config.data || null }
      ],
      parent: this.injector
    });
  }

  private getPositionStrategy(config: OverlayPanelConfig): PositionStrategy {
    if (config.positionStrategy) {
      return config.positionStrategy;
    }

    const position = this.breakpoints.isMobile$.value
      ? config.mobilePosition || config.position
      : config.position;

    if (!position) {
      throw new Error('OverlayPanelPosition is required but was undefined.');
    }

    if (config.origin === 'global' || this.positionIsGlobal(position)) {
      return this.getGlobalPositionStrategy(position);
    } else {
      return this.getConnectedPositionStrategy(position, config.origin as ElementRef);
    }
  }

  private positionIsGlobal(position: OverlayPanelPosition): boolean {
    return position === 'center' || !Array.isArray(position);
  }

  private getGlobalPositionStrategy(position: OverlayPanelPosition | undefined): PositionStrategy {
    const global = this.overlay.position().global();
    if (position === 'center') {
      return global.centerHorizontally().centerVertically();
    }

    if (position && typeof position === 'object' && !Array.isArray(position)) {
      Object.entries(position).forEach(([key, value]) => {
        (global as any)[key](value);
      });
    }

    return global;
  }

  private getConnectedPositionStrategy(
    position: OverlayPanelPosition,
    origin: ElementRef
  ): PositionStrategy {
    return this.overlay
      .position()
      .flexibleConnectedTo(origin)
      .withPositions(position as ConnectedPosition[])
      .withPush(true)
      .withViewportMargin(5);
  }
}
