import {
  MatTooltipModule
} from "./chunk-UCPCGVWM.js";
import {
  MAT_TOOLTIP_DEFAULT_OPTIONS,
  MAT_TOOLTIP_DEFAULT_OPTIONS_FACTORY,
  MAT_TOOLTIP_SCROLL_STRATEGY,
  MAT_TOOLTIP_SCROLL_STRATEGY_FACTORY,
  MAT_TOOLTIP_SCROLL_STRATEGY_FACTORY_PROVIDER,
  MatTooltip,
  SCROLL_THROTTLE_MS,
  TOOLTIP_PANEL_CLASS,
  TooltipComponent,
  getMatTooltipInvalidPositionError
} from "./chunk-MH7DTZ3J.js";
import "./chunk-KJ7SRKMY.js";
import "./chunk-YL66IE6N.js";
import "./chunk-OX3NRC6A.js";
import "./chunk-IXM2WPN6.js";
import "./chunk-DA333LAO.js";
import "./chunk-JOYE7UBX.js";
import "./chunk-D2XK4HPT.js";
import "./chunk-VENV3F3G.js";
import "./chunk-L2BZS5YT.js";
import "./chunk-CJ5CTJRM.js";
import "./chunk-XO7EMDWH.js";
import "./chunk-IYC5PNTE.js";
import "./chunk-MORVW7FL.js";
import "./chunk-ZWZPP555.js";
import "./chunk-5JKFW7ED.js";
import "./chunk-2ZKSKDON.js";
import "./chunk-LJ6U7BAJ.js";
import "./chunk-IWUD2LKX.js";
import "./chunk-7UJZXIJQ.js";
import "./chunk-JKATN4OA.js";
import "./chunk-O34ISOC4.js";
import "./chunk-LLGFHRCM.js";
import "./chunk-AV33VXU2.js";
import "./chunk-PY4ZCYAZ.js";
import "./chunk-KNHPMKFE.js";
import "./chunk-ETVJGXMN.js";
import "./chunk-MZVJP6II.js";
import "./chunk-NUYKRDQ6.js";
import "./chunk-4X6VR2I6.js";
import "./chunk-BOEYOKWK.js";
import "./chunk-NMUC745S.js";
import "./chunk-JRFR6BLO.js";
import "./chunk-HWYXSU2G.js";
import "./chunk-MARUHEWW.js";
import "./chunk-N6ESDQJH.js";

// node_modules/@angular/material/fesm2022/tooltip.mjs
var matTooltipAnimations = {
  // Represents:
  // trigger('state', [
  //   state('initial, void, hidden', style({opacity: 0, transform: 'scale(0.8)'})),
  //   state('visible', style({transform: 'scale(1)'})),
  //   transition('* => visible', animate('150ms cubic-bezier(0, 0, 0.2, 1)')),
  //   transition('* => hidden', animate('75ms cubic-bezier(0.4, 0, 1, 1)')),
  // ])
  /** Animation that transitions a tooltip in and out. */
  tooltipState: {
    type: 7,
    name: "state",
    definitions: [
      {
        type: 0,
        name: "initial, void, hidden",
        styles: { type: 6, styles: { opacity: 0, transform: "scale(0.8)" }, offset: null }
      },
      {
        type: 0,
        name: "visible",
        styles: { type: 6, styles: { transform: "scale(1)" }, offset: null }
      },
      {
        type: 1,
        expr: "* => visible",
        animation: { type: 4, styles: null, timings: "150ms cubic-bezier(0, 0, 0.2, 1)" },
        options: null
      },
      {
        type: 1,
        expr: "* => hidden",
        animation: { type: 4, styles: null, timings: "75ms cubic-bezier(0.4, 0, 1, 1)" },
        options: null
      }
    ],
    options: {}
  }
};
export {
  MAT_TOOLTIP_DEFAULT_OPTIONS,
  MAT_TOOLTIP_DEFAULT_OPTIONS_FACTORY,
  MAT_TOOLTIP_SCROLL_STRATEGY,
  MAT_TOOLTIP_SCROLL_STRATEGY_FACTORY,
  MAT_TOOLTIP_SCROLL_STRATEGY_FACTORY_PROVIDER,
  MatTooltip,
  MatTooltipModule,
  SCROLL_THROTTLE_MS,
  TOOLTIP_PANEL_CLASS,
  TooltipComponent,
  getMatTooltipInvalidPositionError,
  matTooltipAnimations
};
//# sourceMappingURL=@angular_material_tooltip.js.map
