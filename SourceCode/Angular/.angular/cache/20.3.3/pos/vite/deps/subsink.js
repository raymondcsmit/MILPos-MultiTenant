import {
  __commonJS
} from "./chunk-N6ESDQJH.js";

// node_modules/subsink/dist/subsink.js
var require_subsink = __commonJS({
  "node_modules/subsink/dist/subsink.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var isFunction = function(fn) {
      return typeof fn === "function";
    };
    var SubSink = (
      /** @class */
      (function() {
        function SubSink2() {
          this._subs = [];
        }
        SubSink2.prototype.add = function() {
          var subscriptions = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            subscriptions[_i] = arguments[_i];
          }
          this._subs = this._subs.concat(subscriptions);
        };
        Object.defineProperty(SubSink2.prototype, "sink", {
          /**
           * Assign subscription to this sink to add it to the tracked subscriptions
           * @example
           *  this.subs.sink = observable$.subscribe(...);
           */
          set: function(subscription) {
            this._subs.push(subscription);
          },
          enumerable: true,
          configurable: true
        });
        SubSink2.prototype.unsubscribe = function() {
          this._subs.forEach(function(sub) {
            return sub && isFunction(sub.unsubscribe) && sub.unsubscribe();
          });
          this._subs = [];
        };
        return SubSink2;
      })()
    );
    exports.SubSink = SubSink;
  }
});

// node_modules/subsink/dist/index.js
var require_dist = __commonJS({
  "node_modules/subsink/dist/index.js"(exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    var subsink_1 = require_subsink();
    exports.SubSink = subsink_1.SubSink;
  }
});
export default require_dist();
//# sourceMappingURL=subsink.js.map
