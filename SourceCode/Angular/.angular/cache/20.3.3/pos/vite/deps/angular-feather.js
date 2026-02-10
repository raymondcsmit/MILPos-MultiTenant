import {
  DomSanitizer
} from "./chunk-SI32QB7P.js";
import "./chunk-PY4ZCYAZ.js";
import "./chunk-HLLYHJUF.js";
import "./chunk-4X6VR2I6.js";
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  Input,
  NgModule,
  Optional,
  SecurityContext,
  setClassMetadata,
  ɵɵNgOnChangesFeature,
  ɵɵdefineComponent,
  ɵɵdefineNgModule,
  ɵɵdirectiveInject,
  ɵɵprojection,
  ɵɵprojectionDef
} from "./chunk-BOEYOKWK.js";
import {
  ɵɵdefineInjector,
  ɵɵinject
} from "./chunk-NMUC745S.js";
import "./chunk-JRFR6BLO.js";
import "./chunk-HWYXSU2G.js";
import "./chunk-MARUHEWW.js";
import "./chunk-N6ESDQJH.js";

// node_modules/angular-feather/fesm2015/angular-feather.js
var _c0 = ["*"];
var Icons = class {
  constructor(icons) {
    this.icons = icons;
  }
};
function uppercamelcase(str) {
  return str.toLowerCase().replace(/(?:^\w|[A-Z]|\b\w)/g, (firstLetter) => {
    return firstLetter.toUpperCase();
  }).replace(/[-_]/g, "");
}
var FeatherComponent = class {
  constructor(elem, changeDetector, icons, sanitizer) {
    this.elem = elem;
    this.changeDetector = changeDetector;
    this.icons = icons;
    this.sanitizer = sanitizer;
  }
  ngOnChanges(changes) {
    const icons = Object.assign({}, ...this.icons);
    const svg = icons[uppercamelcase(changes.name.currentValue)] || "";
    if (!svg) {
      console.warn(`Icon not found: ${changes.name.currentValue}
Refer to documentation on https://github.com/michaelbazos/angular-feather`);
    }
    this.elem.nativeElement.innerHTML = this.sanitizer.sanitize(SecurityContext.HTML, this.sanitizer.bypassSecurityTrustHtml(svg));
    this.changeDetector.markForCheck();
  }
};
FeatherComponent.ɵfac = function FeatherComponent_Factory(__ngFactoryType__) {
  return new (__ngFactoryType__ || FeatherComponent)(ɵɵdirectiveInject(ElementRef), ɵɵdirectiveInject(ChangeDetectorRef), ɵɵdirectiveInject(Icons), ɵɵdirectiveInject(DomSanitizer));
};
FeatherComponent.ɵcmp = ɵɵdefineComponent({
  type: FeatherComponent,
  selectors: [["i-feather"], ["feather-icon"]],
  inputs: {
    name: "name"
  },
  standalone: false,
  features: [ɵɵNgOnChangesFeature],
  ngContentSelectors: _c0,
  decls: 1,
  vars: 0,
  template: function FeatherComponent_Template(rf, ctx) {
    if (rf & 1) {
      ɵɵprojectionDef();
      ɵɵprojection(0);
    }
  },
  styles: ["[_nghost-%COMP%]{display:inline-block;width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:2px;stroke-linecap:round;stroke-linejoin:round}"]
});
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(FeatherComponent, [{
    type: Component,
    args: [{
      selector: "i-feather, feather-icon",
      templateUrl: "./feather.component.html",
      styleUrls: ["./feather.component.scss"]
    }]
  }], function() {
    return [{
      type: ElementRef,
      decorators: [{
        type: Inject,
        args: [ElementRef]
      }]
    }, {
      type: ChangeDetectorRef,
      decorators: [{
        type: Inject,
        args: [ChangeDetectorRef]
      }]
    }, {
      type: Icons,
      decorators: [{
        type: Inject,
        args: [Icons]
      }]
    }, {
      type: DomSanitizer,
      decorators: [{
        type: Inject,
        args: [DomSanitizer]
      }]
    }];
  }, {
    name: [{
      type: Input
    }]
  });
})();
var FeatherModule = class _FeatherModule {
  constructor(icons) {
    this.icons = icons;
    if (!this.icons) {
      throw new Error(`No icon provided. Make sure to use 'FeatherModule.pick({ ... })' when importing the module
Refer to documentation on https://github.com/michaelbazos/angular-feather`);
    }
  }
  static pick(icons) {
    return {
      ngModule: _FeatherModule,
      providers: [{
        provide: Icons,
        multi: true,
        useValue: icons
      }]
    };
  }
};
FeatherModule.ɵfac = function FeatherModule_Factory(__ngFactoryType__) {
  return new (__ngFactoryType__ || FeatherModule)(ɵɵinject(Icons, 8));
};
FeatherModule.ɵmod = ɵɵdefineNgModule({
  type: FeatherModule,
  declarations: [FeatherComponent],
  exports: [FeatherComponent]
});
FeatherModule.ɵinj = ɵɵdefineInjector({});
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(FeatherModule, [{
    type: NgModule,
    args: [{
      declarations: [FeatherComponent],
      exports: [FeatherComponent]
    }]
  }], function() {
    return [{
      type: Icons,
      decorators: [{
        type: Optional
      }]
    }];
  }, null);
})();
export {
  FeatherComponent,
  FeatherModule
};
//# sourceMappingURL=angular-feather.js.map
