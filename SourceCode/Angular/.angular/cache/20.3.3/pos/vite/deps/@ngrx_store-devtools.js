import {
  toSignal
} from "./chunk-TIVRQT3Y.js";
import {
  Inject,
  Injectable,
  NgModule,
  NgZone,
  Optional,
  isDevMode,
  setClassMetadata,
  ɵɵdefineNgModule,
  ɵɵgetInheritedFactory
} from "./chunk-BOEYOKWK.js";
import {
  ErrorHandler,
  InjectionToken,
  Injector,
  computed,
  effect,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
  untracked,
  ɵɵdefineInjectable,
  ɵɵdefineInjector,
  ɵɵinject
} from "./chunk-NMUC745S.js";
import "./chunk-JRFR6BLO.js";
import {
  merge,
  queueScheduler
} from "./chunk-HWYXSU2G.js";
import {
  BehaviorSubject,
  EMPTY,
  Observable,
  ReplaySubject,
  Subject,
  catchError,
  concatMap,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  observeOn,
  of,
  pluck,
  scan,
  share,
  skip,
  switchMap,
  take,
  takeUntil,
  timeout,
  withLatestFrom
} from "./chunk-MARUHEWW.js";
import {
  __spreadProps,
  __spreadValues
} from "./chunk-N6ESDQJH.js";

// node_modules/@ngrx/store/fesm2022/ngrx-store.mjs
var REGISTERED_ACTION_TYPES = {};
function assertDefined(value, name) {
  if (value === null || value === void 0) {
    throw new Error(`${name} must be defined.`);
  }
}
var INIT = "@ngrx/store/init";
var _ActionsSubject = class _ActionsSubject extends BehaviorSubject {
  constructor() {
    super({
      type: INIT
    });
  }
  next(action) {
    if (typeof action === "function") {
      throw new TypeError(`
        Dispatch expected an object, instead it received a function.
        If you're using the createAction function, make sure to invoke the function
        before dispatching the action. For example, someAction should be someAction().`);
    } else if (typeof action === "undefined") {
      throw new TypeError(`Actions must be objects`);
    } else if (typeof action.type === "undefined") {
      throw new TypeError(`Actions must have a type property`);
    }
    super.next(action);
  }
  complete() {
  }
  ngOnDestroy() {
    super.complete();
  }
};
_ActionsSubject.ɵfac = function ActionsSubject_Factory(__ngFactoryType__) {
  return new (__ngFactoryType__ || _ActionsSubject)();
};
_ActionsSubject.ɵprov = ɵɵdefineInjectable({
  token: _ActionsSubject,
  factory: _ActionsSubject.ɵfac
});
var ActionsSubject = _ActionsSubject;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ActionsSubject, [{
    type: Injectable
  }], () => [], null);
})();
var ACTIONS_SUBJECT_PROVIDERS = [ActionsSubject];
var _ROOT_STORE_GUARD = new InjectionToken("@ngrx/store Internal Root Guard");
var _INITIAL_STATE = new InjectionToken("@ngrx/store Internal Initial State");
var INITIAL_STATE = new InjectionToken("@ngrx/store Initial State");
var REDUCER_FACTORY = new InjectionToken("@ngrx/store Reducer Factory");
var _REDUCER_FACTORY = new InjectionToken("@ngrx/store Internal Reducer Factory Provider");
var INITIAL_REDUCERS = new InjectionToken("@ngrx/store Initial Reducers");
var _INITIAL_REDUCERS = new InjectionToken("@ngrx/store Internal Initial Reducers");
var STORE_FEATURES = new InjectionToken("@ngrx/store Store Features");
var _STORE_REDUCERS = new InjectionToken("@ngrx/store Internal Store Reducers");
var _FEATURE_REDUCERS = new InjectionToken("@ngrx/store Internal Feature Reducers");
var _FEATURE_CONFIGS = new InjectionToken("@ngrx/store Internal Feature Configs");
var _STORE_FEATURES = new InjectionToken("@ngrx/store Internal Store Features");
var _FEATURE_REDUCERS_TOKEN = new InjectionToken("@ngrx/store Internal Feature Reducers Token");
var FEATURE_REDUCERS = new InjectionToken("@ngrx/store Feature Reducers");
var USER_PROVIDED_META_REDUCERS = new InjectionToken("@ngrx/store User Provided Meta Reducers");
var META_REDUCERS = new InjectionToken("@ngrx/store Meta Reducers");
var _RESOLVED_META_REDUCERS = new InjectionToken("@ngrx/store Internal Resolved Meta Reducers");
var USER_RUNTIME_CHECKS = new InjectionToken("@ngrx/store User Runtime Checks Config");
var _USER_RUNTIME_CHECKS = new InjectionToken("@ngrx/store Internal User Runtime Checks Config");
var ACTIVE_RUNTIME_CHECKS = new InjectionToken("@ngrx/store Internal Runtime Checks");
var _ACTION_TYPE_UNIQUENESS_CHECK = new InjectionToken("@ngrx/store Check if Action types are unique");
var ROOT_STORE_PROVIDER = new InjectionToken("@ngrx/store Root Store Provider");
var FEATURE_STATE_PROVIDER = new InjectionToken("@ngrx/store Feature State Provider");
function combineReducers(reducers, initialState = {}) {
  const reducerKeys = Object.keys(reducers);
  const finalReducers = {};
  for (let i = 0; i < reducerKeys.length; i++) {
    const key = reducerKeys[i];
    if (typeof reducers[key] === "function") {
      finalReducers[key] = reducers[key];
    }
  }
  const finalReducerKeys = Object.keys(finalReducers);
  return function combination(state, action) {
    state = state === void 0 ? initialState : state;
    let hasChanged = false;
    const nextState = {};
    for (let i = 0; i < finalReducerKeys.length; i++) {
      const key = finalReducerKeys[i];
      const reducer = finalReducers[key];
      const previousStateForKey = state[key];
      const nextStateForKey = reducer(previousStateForKey, action);
      nextState[key] = nextStateForKey;
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
    }
    return hasChanged ? nextState : state;
  };
}
function omit(object, keyToRemove) {
  return Object.keys(object).filter((key) => key !== keyToRemove).reduce((result, key) => Object.assign(result, {
    [key]: object[key]
  }), {});
}
function compose(...functions) {
  return function(arg) {
    if (functions.length === 0) {
      return arg;
    }
    const last = functions[functions.length - 1];
    const rest = functions.slice(0, -1);
    return rest.reduceRight((composed, fn) => fn(composed), last(arg));
  };
}
function createReducerFactory(reducerFactory, metaReducers) {
  if (Array.isArray(metaReducers) && metaReducers.length > 0) {
    reducerFactory = compose.apply(null, [...metaReducers, reducerFactory]);
  }
  return (reducers, initialState) => {
    const reducer = reducerFactory(reducers);
    return (state, action) => {
      state = state === void 0 ? initialState : state;
      return reducer(state, action);
    };
  };
}
function createFeatureReducerFactory(metaReducers) {
  const reducerFactory = Array.isArray(metaReducers) && metaReducers.length > 0 ? compose(...metaReducers) : (r) => r;
  return (reducer, initialState) => {
    reducer = reducerFactory(reducer);
    return (state, action) => {
      state = state === void 0 ? initialState : state;
      return reducer(state, action);
    };
  };
}
var ReducerObservable = class extends Observable {
};
var ReducerManagerDispatcher = class extends ActionsSubject {
};
var UPDATE = "@ngrx/store/update-reducers";
var _ReducerManager = class _ReducerManager extends BehaviorSubject {
  get currentReducers() {
    return this.reducers;
  }
  constructor(dispatcher, initialState, reducers, reducerFactory) {
    super(reducerFactory(reducers, initialState));
    this.dispatcher = dispatcher;
    this.initialState = initialState;
    this.reducers = reducers;
    this.reducerFactory = reducerFactory;
  }
  addFeature(feature) {
    this.addFeatures([feature]);
  }
  addFeatures(features) {
    const reducers = features.reduce((reducerDict, {
      reducers: reducers2,
      reducerFactory,
      metaReducers,
      initialState,
      key
    }) => {
      const reducer = typeof reducers2 === "function" ? createFeatureReducerFactory(metaReducers)(reducers2, initialState) : createReducerFactory(reducerFactory, metaReducers)(reducers2, initialState);
      reducerDict[key] = reducer;
      return reducerDict;
    }, {});
    this.addReducers(reducers);
  }
  removeFeature(feature) {
    this.removeFeatures([feature]);
  }
  removeFeatures(features) {
    this.removeReducers(features.map((p) => p.key));
  }
  addReducer(key, reducer) {
    this.addReducers({
      [key]: reducer
    });
  }
  addReducers(reducers) {
    this.reducers = __spreadValues(__spreadValues({}, this.reducers), reducers);
    this.updateReducers(Object.keys(reducers));
  }
  removeReducer(featureKey) {
    this.removeReducers([featureKey]);
  }
  removeReducers(featureKeys) {
    featureKeys.forEach((key) => {
      this.reducers = omit(this.reducers, key);
    });
    this.updateReducers(featureKeys);
  }
  updateReducers(featureKeys) {
    this.next(this.reducerFactory(this.reducers, this.initialState));
    this.dispatcher.next({
      type: UPDATE,
      features: featureKeys
    });
  }
  ngOnDestroy() {
    this.complete();
  }
};
_ReducerManager.ɵfac = function ReducerManager_Factory(__ngFactoryType__) {
  return new (__ngFactoryType__ || _ReducerManager)(ɵɵinject(ReducerManagerDispatcher), ɵɵinject(INITIAL_STATE), ɵɵinject(INITIAL_REDUCERS), ɵɵinject(REDUCER_FACTORY));
};
_ReducerManager.ɵprov = ɵɵdefineInjectable({
  token: _ReducerManager,
  factory: _ReducerManager.ɵfac
});
var ReducerManager = _ReducerManager;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ReducerManager, [{
    type: Injectable
  }], () => [{
    type: ReducerManagerDispatcher
  }, {
    type: void 0,
    decorators: [{
      type: Inject,
      args: [INITIAL_STATE]
    }]
  }, {
    type: void 0,
    decorators: [{
      type: Inject,
      args: [INITIAL_REDUCERS]
    }]
  }, {
    type: void 0,
    decorators: [{
      type: Inject,
      args: [REDUCER_FACTORY]
    }]
  }], null);
})();
var REDUCER_MANAGER_PROVIDERS = [ReducerManager, {
  provide: ReducerObservable,
  useExisting: ReducerManager
}, {
  provide: ReducerManagerDispatcher,
  useExisting: ActionsSubject
}];
var _ScannedActionsSubject = class _ScannedActionsSubject extends Subject {
  ngOnDestroy() {
    this.complete();
  }
};
_ScannedActionsSubject.ɵfac = /* @__PURE__ */ (() => {
  let ɵScannedActionsSubject_BaseFactory;
  return function ScannedActionsSubject_Factory(__ngFactoryType__) {
    return (ɵScannedActionsSubject_BaseFactory || (ɵScannedActionsSubject_BaseFactory = ɵɵgetInheritedFactory(_ScannedActionsSubject)))(__ngFactoryType__ || _ScannedActionsSubject);
  };
})();
_ScannedActionsSubject.ɵprov = ɵɵdefineInjectable({
  token: _ScannedActionsSubject,
  factory: _ScannedActionsSubject.ɵfac
});
var ScannedActionsSubject = _ScannedActionsSubject;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ScannedActionsSubject, [{
    type: Injectable
  }], null, null);
})();
var SCANNED_ACTIONS_SUBJECT_PROVIDERS = [ScannedActionsSubject];
var StateObservable = class extends Observable {
};
var _State = class _State extends BehaviorSubject {
  constructor(actions$, reducer$, scannedActions, initialState) {
    super(initialState);
    const actionsOnQueue$ = actions$.pipe(observeOn(queueScheduler));
    const withLatestReducer$ = actionsOnQueue$.pipe(withLatestFrom(reducer$));
    const seed = {
      state: initialState
    };
    const stateAndAction$ = withLatestReducer$.pipe(scan(reduceState, seed));
    this.stateSubscription = stateAndAction$.subscribe(({
      state,
      action
    }) => {
      this.next(state);
      scannedActions.next(action);
    });
    this.state = toSignal(this, {
      manualCleanup: true,
      requireSync: true
    });
  }
  ngOnDestroy() {
    this.stateSubscription.unsubscribe();
    this.complete();
  }
};
_State.INIT = INIT;
_State.ɵfac = function State_Factory(__ngFactoryType__) {
  return new (__ngFactoryType__ || _State)(ɵɵinject(ActionsSubject), ɵɵinject(ReducerObservable), ɵɵinject(ScannedActionsSubject), ɵɵinject(INITIAL_STATE));
};
_State.ɵprov = ɵɵdefineInjectable({
  token: _State,
  factory: _State.ɵfac
});
var State = _State;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(State, [{
    type: Injectable
  }], () => [{
    type: ActionsSubject
  }, {
    type: ReducerObservable
  }, {
    type: ScannedActionsSubject
  }, {
    type: void 0,
    decorators: [{
      type: Inject,
      args: [INITIAL_STATE]
    }]
  }], null);
})();
function reduceState(stateActionPair = {
  state: void 0
}, [action, reducer]) {
  const {
    state
  } = stateActionPair;
  return {
    state: reducer(state, action),
    action
  };
}
var STATE_PROVIDERS = [State, {
  provide: StateObservable,
  useExisting: State
}];
var _Store = class _Store extends Observable {
  constructor(state$, actionsObserver, reducerManager, injector) {
    super();
    this.actionsObserver = actionsObserver;
    this.reducerManager = reducerManager;
    this.injector = injector;
    this.source = state$;
    this.state = state$.state;
  }
  /**
   * @deprecated Selectors with props are deprecated, for more info see {@link https://github.com/ngrx/platform/issues/2980 Github Issue}
   */
  select(pathOrMapFn, ...paths) {
    return select.call(null, pathOrMapFn, ...paths)(this);
  }
  /**
   * Returns a signal of the provided selector.
   *
   * @param selector selector function
   * @param options select signal options
   * @returns Signal of the state selected by the provided selector
   * @usageNotes
   *
   * ```ts
   * const count = this.store.selectSignal(state => state.count);
   * ```
   *
   * Or with a selector created by @ngrx/store!createSelector:function
   *
   * ```ts
   * const selectCount = createSelector(
   *  (state: State) => state.count,
   * );
   *
   * const count = this.store.selectSignal(selectCount);
   * ```
   */
  selectSignal(selector, options) {
    return computed(() => selector(this.state()), options);
  }
  lift(operator) {
    const store = new _Store(this, this.actionsObserver, this.reducerManager);
    store.operator = operator;
    return store;
  }
  dispatch(actionOrDispatchFn, config) {
    if (typeof actionOrDispatchFn === "function") {
      return this.processDispatchFn(actionOrDispatchFn, config);
    }
    this.actionsObserver.next(actionOrDispatchFn);
  }
  next(action) {
    this.actionsObserver.next(action);
  }
  error(err) {
    this.actionsObserver.error(err);
  }
  complete() {
    this.actionsObserver.complete();
  }
  addReducer(key, reducer) {
    this.reducerManager.addReducer(key, reducer);
  }
  removeReducer(key) {
    this.reducerManager.removeReducer(key);
  }
  processDispatchFn(dispatchFn, config) {
    assertDefined(this.injector, "Store Injector");
    const effectInjector = config?.injector ?? getCallerInjector() ?? this.injector;
    return effect(() => {
      const action = dispatchFn();
      untracked(() => this.dispatch(action));
    }, {
      injector: effectInjector
    });
  }
};
_Store.ɵfac = function Store_Factory(__ngFactoryType__) {
  return new (__ngFactoryType__ || _Store)(ɵɵinject(StateObservable), ɵɵinject(ActionsSubject), ɵɵinject(ReducerManager), ɵɵinject(Injector));
};
_Store.ɵprov = ɵɵdefineInjectable({
  token: _Store,
  factory: _Store.ɵfac
});
var Store = _Store;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(Store, [{
    type: Injectable
  }], () => [{
    type: StateObservable
  }, {
    type: ActionsSubject
  }, {
    type: ReducerManager
  }, {
    type: Injector
  }], null);
})();
var STORE_PROVIDERS = [Store];
function select(pathOrMapFn, propsOrPath, ...paths) {
  return function selectOperator(source$) {
    let mapped$;
    if (typeof pathOrMapFn === "string") {
      const pathSlices = [propsOrPath, ...paths].filter(Boolean);
      mapped$ = source$.pipe(pluck(pathOrMapFn, ...pathSlices));
    } else if (typeof pathOrMapFn === "function") {
      mapped$ = source$.pipe(map((source) => pathOrMapFn(source, propsOrPath)));
    } else {
      throw new TypeError(`Unexpected type '${typeof pathOrMapFn}' in select operator, expected 'string' or 'function'`);
    }
    return mapped$.pipe(distinctUntilChanged());
  };
}
function getCallerInjector() {
  try {
    return inject(Injector);
  } catch (_) {
    return void 0;
  }
}
var RUNTIME_CHECK_URL = "https://ngrx.io/guide/store/configuration/runtime-checks";
function isUndefined(target) {
  return target === void 0;
}
function isNull(target) {
  return target === null;
}
function isArray(target) {
  return Array.isArray(target);
}
function isString(target) {
  return typeof target === "string";
}
function isBoolean(target) {
  return typeof target === "boolean";
}
function isNumber(target) {
  return typeof target === "number";
}
function isObjectLike(target) {
  return typeof target === "object" && target !== null;
}
function isObject(target) {
  return isObjectLike(target) && !isArray(target);
}
function isPlainObject(target) {
  if (!isObject(target)) {
    return false;
  }
  const targetPrototype = Object.getPrototypeOf(target);
  return targetPrototype === Object.prototype || targetPrototype === null;
}
function isFunction(target) {
  return typeof target === "function";
}
function isComponent(target) {
  return isFunction(target) && target.hasOwnProperty("ɵcmp");
}
function hasOwnProperty(target, propertyName) {
  return Object.prototype.hasOwnProperty.call(target, propertyName);
}
function _createStoreReducers(reducers) {
  return reducers instanceof InjectionToken ? inject(reducers) : reducers;
}
function _createFeatureStore(configs, featureStores) {
  return featureStores.map((feat, index) => {
    if (configs[index] instanceof InjectionToken) {
      const conf = inject(configs[index]);
      return {
        key: feat.key,
        reducerFactory: conf.reducerFactory ? conf.reducerFactory : combineReducers,
        metaReducers: conf.metaReducers ? conf.metaReducers : [],
        initialState: conf.initialState
      };
    }
    return feat;
  });
}
function _createFeatureReducers(reducerCollection) {
  return reducerCollection.map((reducer) => {
    return reducer instanceof InjectionToken ? inject(reducer) : reducer;
  });
}
function _initialStateFactory(initialState) {
  if (typeof initialState === "function") {
    return initialState();
  }
  return initialState;
}
function _concatMetaReducers(metaReducers, userProvidedMetaReducers) {
  return metaReducers.concat(userProvidedMetaReducers);
}
function _provideForRootGuard() {
  const store = inject(Store, {
    optional: true,
    skipSelf: true
  });
  if (store) {
    throw new TypeError(`The root Store has been provided more than once. Feature modules should provide feature states instead.`);
  }
  return "guarded";
}
function immutabilityCheckMetaReducer(reducer, checks) {
  return function(state, action) {
    const act = checks.action(action) ? freeze(action) : action;
    const nextState = reducer(state, act);
    return checks.state() ? freeze(nextState) : nextState;
  };
}
function freeze(target) {
  Object.freeze(target);
  const targetIsFunction = isFunction(target);
  Object.getOwnPropertyNames(target).forEach((prop) => {
    if (prop.startsWith("ɵ")) {
      return;
    }
    if (hasOwnProperty(target, prop) && (targetIsFunction ? prop !== "caller" && prop !== "callee" && prop !== "arguments" : true)) {
      const propValue = target[prop];
      if ((isObjectLike(propValue) || isFunction(propValue)) && !Object.isFrozen(propValue)) {
        freeze(propValue);
      }
    }
  });
  return target;
}
function serializationCheckMetaReducer(reducer, checks) {
  return function(state, action) {
    if (checks.action(action)) {
      const unserializableAction = getUnserializable(action);
      throwIfUnserializable(unserializableAction, "action");
    }
    const nextState = reducer(state, action);
    if (checks.state()) {
      const unserializableState = getUnserializable(nextState);
      throwIfUnserializable(unserializableState, "state");
    }
    return nextState;
  };
}
function getUnserializable(target, path = []) {
  if ((isUndefined(target) || isNull(target)) && path.length === 0) {
    return {
      path: ["root"],
      value: target
    };
  }
  const keys = Object.keys(target);
  return keys.reduce((result, key) => {
    if (result) {
      return result;
    }
    const value = target[key];
    if (isComponent(value)) {
      return result;
    }
    if (isUndefined(value) || isNull(value) || isNumber(value) || isBoolean(value) || isString(value) || isArray(value)) {
      return false;
    }
    if (isPlainObject(value)) {
      return getUnserializable(value, [...path, key]);
    }
    return {
      path: [...path, key],
      value
    };
  }, false);
}
function throwIfUnserializable(unserializable, context) {
  if (unserializable === false) {
    return;
  }
  const unserializablePath = unserializable.path.join(".");
  const error = new Error(`Detected unserializable ${context} at "${unserializablePath}". ${RUNTIME_CHECK_URL}#strict${context}serializability`);
  error.value = unserializable.value;
  error.unserializablePath = unserializablePath;
  throw error;
}
function inNgZoneAssertMetaReducer(reducer, checks) {
  return function(state, action) {
    if (checks.action(action) && !NgZone.isInAngularZone()) {
      throw new Error(`Action '${action.type}' running outside NgZone. ${RUNTIME_CHECK_URL}#strictactionwithinngzone`);
    }
    return reducer(state, action);
  };
}
function createActiveRuntimeChecks(runtimeChecks) {
  if (isDevMode()) {
    return __spreadValues({
      strictStateSerializability: false,
      strictActionSerializability: false,
      strictStateImmutability: true,
      strictActionImmutability: true,
      strictActionWithinNgZone: false,
      strictActionTypeUniqueness: false
    }, runtimeChecks);
  }
  return {
    strictStateSerializability: false,
    strictActionSerializability: false,
    strictStateImmutability: false,
    strictActionImmutability: false,
    strictActionWithinNgZone: false,
    strictActionTypeUniqueness: false
  };
}
function createSerializationCheckMetaReducer({
  strictActionSerializability,
  strictStateSerializability
}) {
  return (reducer) => strictActionSerializability || strictStateSerializability ? serializationCheckMetaReducer(reducer, {
    action: (action) => strictActionSerializability && !ignoreNgrxAction(action),
    state: () => strictStateSerializability
  }) : reducer;
}
function createImmutabilityCheckMetaReducer({
  strictActionImmutability,
  strictStateImmutability
}) {
  return (reducer) => strictActionImmutability || strictStateImmutability ? immutabilityCheckMetaReducer(reducer, {
    action: (action) => strictActionImmutability && !ignoreNgrxAction(action),
    state: () => strictStateImmutability
  }) : reducer;
}
function ignoreNgrxAction(action) {
  return action.type.startsWith("@ngrx");
}
function createInNgZoneCheckMetaReducer({
  strictActionWithinNgZone
}) {
  return (reducer) => strictActionWithinNgZone ? inNgZoneAssertMetaReducer(reducer, {
    action: (action) => strictActionWithinNgZone && !ignoreNgrxAction(action)
  }) : reducer;
}
function provideRuntimeChecks(runtimeChecks) {
  return [{
    provide: _USER_RUNTIME_CHECKS,
    useValue: runtimeChecks
  }, {
    provide: USER_RUNTIME_CHECKS,
    useFactory: _runtimeChecksFactory,
    deps: [_USER_RUNTIME_CHECKS]
  }, {
    provide: ACTIVE_RUNTIME_CHECKS,
    deps: [USER_RUNTIME_CHECKS],
    useFactory: createActiveRuntimeChecks
  }, {
    provide: META_REDUCERS,
    multi: true,
    deps: [ACTIVE_RUNTIME_CHECKS],
    useFactory: createImmutabilityCheckMetaReducer
  }, {
    provide: META_REDUCERS,
    multi: true,
    deps: [ACTIVE_RUNTIME_CHECKS],
    useFactory: createSerializationCheckMetaReducer
  }, {
    provide: META_REDUCERS,
    multi: true,
    deps: [ACTIVE_RUNTIME_CHECKS],
    useFactory: createInNgZoneCheckMetaReducer
  }];
}
function checkForActionTypeUniqueness() {
  return [{
    provide: _ACTION_TYPE_UNIQUENESS_CHECK,
    multi: true,
    deps: [ACTIVE_RUNTIME_CHECKS],
    useFactory: _actionTypeUniquenessCheck
  }];
}
function _runtimeChecksFactory(runtimeChecks) {
  return runtimeChecks;
}
function _actionTypeUniquenessCheck(config) {
  if (!config.strictActionTypeUniqueness) {
    return;
  }
  const duplicates = Object.entries(REGISTERED_ACTION_TYPES).filter(([, registrations]) => registrations > 1).map(([type]) => type);
  if (duplicates.length) {
    throw new Error(`Action types are registered more than once, ${duplicates.map((type) => `"${type}"`).join(", ")}. ${RUNTIME_CHECK_URL}#strictactiontypeuniqueness`);
  }
}
function _provideStore(reducers = {}, config = {}) {
  return [{
    provide: _ROOT_STORE_GUARD,
    useFactory: _provideForRootGuard
  }, {
    provide: _INITIAL_STATE,
    useValue: config.initialState
  }, {
    provide: INITIAL_STATE,
    useFactory: _initialStateFactory,
    deps: [_INITIAL_STATE]
  }, {
    provide: _INITIAL_REDUCERS,
    useValue: reducers
  }, {
    provide: _STORE_REDUCERS,
    useExisting: reducers instanceof InjectionToken ? reducers : _INITIAL_REDUCERS
  }, {
    provide: INITIAL_REDUCERS,
    deps: [_INITIAL_REDUCERS, [new Inject(_STORE_REDUCERS)]],
    useFactory: _createStoreReducers
  }, {
    provide: USER_PROVIDED_META_REDUCERS,
    useValue: config.metaReducers ? config.metaReducers : []
  }, {
    provide: _RESOLVED_META_REDUCERS,
    deps: [META_REDUCERS, USER_PROVIDED_META_REDUCERS],
    useFactory: _concatMetaReducers
  }, {
    provide: _REDUCER_FACTORY,
    useValue: config.reducerFactory ? config.reducerFactory : combineReducers
  }, {
    provide: REDUCER_FACTORY,
    deps: [_REDUCER_FACTORY, _RESOLVED_META_REDUCERS],
    useFactory: createReducerFactory
  }, ACTIONS_SUBJECT_PROVIDERS, REDUCER_MANAGER_PROVIDERS, SCANNED_ACTIONS_SUBJECT_PROVIDERS, STATE_PROVIDERS, STORE_PROVIDERS, provideRuntimeChecks(config.runtimeChecks), checkForActionTypeUniqueness()];
}
function rootStoreProviderFactory() {
  inject(ActionsSubject);
  inject(ReducerObservable);
  inject(ScannedActionsSubject);
  inject(Store);
  inject(_ROOT_STORE_GUARD, {
    optional: true
  });
  inject(_ACTION_TYPE_UNIQUENESS_CHECK, {
    optional: true
  });
}
var ENVIRONMENT_STORE_PROVIDER = [{
  provide: ROOT_STORE_PROVIDER,
  useFactory: rootStoreProviderFactory
}, provideEnvironmentInitializer(() => inject(ROOT_STORE_PROVIDER))];
function featureStateProviderFactory() {
  inject(ROOT_STORE_PROVIDER);
  const features = inject(_STORE_FEATURES);
  const featureReducers = inject(FEATURE_REDUCERS);
  const reducerManager = inject(ReducerManager);
  inject(_ACTION_TYPE_UNIQUENESS_CHECK, {
    optional: true
  });
  const feats = features.map((feature, index) => {
    const featureReducerCollection = featureReducers.shift();
    const reducers = featureReducerCollection[index];
    return __spreadProps(__spreadValues({}, feature), {
      reducers,
      initialState: _initialStateFactory(feature.initialState)
    });
  });
  reducerManager.addFeatures(feats);
}
var ENVIRONMENT_STATE_PROVIDER = [{
  provide: FEATURE_STATE_PROVIDER,
  useFactory: featureStateProviderFactory
}, provideEnvironmentInitializer(() => inject(FEATURE_STATE_PROVIDER))];
function _provideState(featureNameOrSlice, reducers, config = {}) {
  return [{
    provide: _FEATURE_CONFIGS,
    multi: true,
    useValue: featureNameOrSlice instanceof Object ? {} : config
  }, {
    provide: STORE_FEATURES,
    multi: true,
    useValue: {
      key: featureNameOrSlice instanceof Object ? featureNameOrSlice.name : featureNameOrSlice,
      reducerFactory: !(config instanceof InjectionToken) && config.reducerFactory ? config.reducerFactory : combineReducers,
      metaReducers: !(config instanceof InjectionToken) && config.metaReducers ? config.metaReducers : [],
      initialState: !(config instanceof InjectionToken) && config.initialState ? config.initialState : void 0
    }
  }, {
    provide: _STORE_FEATURES,
    deps: [_FEATURE_CONFIGS, STORE_FEATURES],
    useFactory: _createFeatureStore
  }, {
    provide: _FEATURE_REDUCERS,
    multi: true,
    useValue: featureNameOrSlice instanceof Object ? featureNameOrSlice.reducer : reducers
  }, {
    provide: _FEATURE_REDUCERS_TOKEN,
    multi: true,
    useExisting: reducers instanceof InjectionToken ? reducers : _FEATURE_REDUCERS
  }, {
    provide: FEATURE_REDUCERS,
    multi: true,
    deps: [_FEATURE_REDUCERS, [new Inject(_FEATURE_REDUCERS_TOKEN)]],
    useFactory: _createFeatureReducers
  }, checkForActionTypeUniqueness()];
}
var _StoreRootModule = class _StoreRootModule {
  constructor(actions$, reducer$, scannedActions$, store, guard, actionCheck) {
  }
};
_StoreRootModule.ɵfac = function StoreRootModule_Factory(__ngFactoryType__) {
  return new (__ngFactoryType__ || _StoreRootModule)(ɵɵinject(ActionsSubject), ɵɵinject(ReducerObservable), ɵɵinject(ScannedActionsSubject), ɵɵinject(Store), ɵɵinject(_ROOT_STORE_GUARD, 8), ɵɵinject(_ACTION_TYPE_UNIQUENESS_CHECK, 8));
};
_StoreRootModule.ɵmod = ɵɵdefineNgModule({
  type: _StoreRootModule
});
_StoreRootModule.ɵinj = ɵɵdefineInjector({});
var StoreRootModule = _StoreRootModule;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(StoreRootModule, [{
    type: NgModule,
    args: [{}]
  }], () => [{
    type: ActionsSubject
  }, {
    type: ReducerObservable
  }, {
    type: ScannedActionsSubject
  }, {
    type: Store
  }, {
    type: void 0,
    decorators: [{
      type: Optional
    }, {
      type: Inject,
      args: [_ROOT_STORE_GUARD]
    }]
  }, {
    type: void 0,
    decorators: [{
      type: Optional
    }, {
      type: Inject,
      args: [_ACTION_TYPE_UNIQUENESS_CHECK]
    }]
  }], null);
})();
var _StoreFeatureModule = class _StoreFeatureModule {
  constructor(features, featureReducers, reducerManager, root, actionCheck) {
    this.features = features;
    this.featureReducers = featureReducers;
    this.reducerManager = reducerManager;
    const feats = features.map((feature, index) => {
      const featureReducerCollection = featureReducers.shift();
      const reducers = featureReducerCollection[index];
      return __spreadProps(__spreadValues({}, feature), {
        reducers,
        initialState: _initialStateFactory(feature.initialState)
      });
    });
    reducerManager.addFeatures(feats);
  }
  // eslint-disable-next-line @angular-eslint/contextual-lifecycle
  ngOnDestroy() {
    this.reducerManager.removeFeatures(this.features);
  }
};
_StoreFeatureModule.ɵfac = function StoreFeatureModule_Factory(__ngFactoryType__) {
  return new (__ngFactoryType__ || _StoreFeatureModule)(ɵɵinject(_STORE_FEATURES), ɵɵinject(FEATURE_REDUCERS), ɵɵinject(ReducerManager), ɵɵinject(StoreRootModule), ɵɵinject(_ACTION_TYPE_UNIQUENESS_CHECK, 8));
};
_StoreFeatureModule.ɵmod = ɵɵdefineNgModule({
  type: _StoreFeatureModule
});
_StoreFeatureModule.ɵinj = ɵɵdefineInjector({});
var StoreFeatureModule = _StoreFeatureModule;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(StoreFeatureModule, [{
    type: NgModule,
    args: [{}]
  }], () => [{
    type: void 0,
    decorators: [{
      type: Inject,
      args: [_STORE_FEATURES]
    }]
  }, {
    type: void 0,
    decorators: [{
      type: Inject,
      args: [FEATURE_REDUCERS]
    }]
  }, {
    type: ReducerManager
  }, {
    type: StoreRootModule
  }, {
    type: void 0,
    decorators: [{
      type: Optional
    }, {
      type: Inject,
      args: [_ACTION_TYPE_UNIQUENESS_CHECK]
    }]
  }], null);
})();
var _StoreModule = class _StoreModule {
  static forRoot(reducers, config) {
    return {
      ngModule: StoreRootModule,
      providers: [..._provideStore(reducers, config)]
    };
  }
  static forFeature(featureNameOrSlice, reducers, config = {}) {
    return {
      ngModule: StoreFeatureModule,
      providers: [..._provideState(featureNameOrSlice, reducers, config)]
    };
  }
};
_StoreModule.ɵfac = function StoreModule_Factory(__ngFactoryType__) {
  return new (__ngFactoryType__ || _StoreModule)();
};
_StoreModule.ɵmod = ɵɵdefineNgModule({
  type: _StoreModule
});
_StoreModule.ɵinj = ɵɵdefineInjector({});
var StoreModule = _StoreModule;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(StoreModule, [{
    type: NgModule,
    args: [{}]
  }], null, null);
})();

// node_modules/@ngrx/store-devtools/fesm2022/ngrx-store-devtools.mjs
var PERFORM_ACTION = "PERFORM_ACTION";
var REFRESH = "REFRESH";
var RESET = "RESET";
var ROLLBACK = "ROLLBACK";
var COMMIT = "COMMIT";
var SWEEP = "SWEEP";
var TOGGLE_ACTION = "TOGGLE_ACTION";
var SET_ACTIONS_ACTIVE = "SET_ACTIONS_ACTIVE";
var JUMP_TO_STATE = "JUMP_TO_STATE";
var JUMP_TO_ACTION = "JUMP_TO_ACTION";
var IMPORT_STATE = "IMPORT_STATE";
var LOCK_CHANGES = "LOCK_CHANGES";
var PAUSE_RECORDING = "PAUSE_RECORDING";
var PerformAction = class {
  constructor(action, timestamp) {
    this.action = action;
    this.timestamp = timestamp;
    this.type = PERFORM_ACTION;
    if (typeof action.type === "undefined") {
      throw new Error('Actions may not have an undefined "type" property. Have you misspelled a constant?');
    }
  }
};
var Refresh = class {
  constructor() {
    this.type = REFRESH;
  }
};
var Reset = class {
  constructor(timestamp) {
    this.timestamp = timestamp;
    this.type = RESET;
  }
};
var Rollback = class {
  constructor(timestamp) {
    this.timestamp = timestamp;
    this.type = ROLLBACK;
  }
};
var Commit = class {
  constructor(timestamp) {
    this.timestamp = timestamp;
    this.type = COMMIT;
  }
};
var Sweep = class {
  constructor() {
    this.type = SWEEP;
  }
};
var ToggleAction = class {
  constructor(id) {
    this.id = id;
    this.type = TOGGLE_ACTION;
  }
};
var JumpToState = class {
  constructor(index) {
    this.index = index;
    this.type = JUMP_TO_STATE;
  }
};
var JumpToAction = class {
  constructor(actionId) {
    this.actionId = actionId;
    this.type = JUMP_TO_ACTION;
  }
};
var ImportState = class {
  constructor(nextLiftedState) {
    this.nextLiftedState = nextLiftedState;
    this.type = IMPORT_STATE;
  }
};
var LockChanges = class {
  constructor(status) {
    this.status = status;
    this.type = LOCK_CHANGES;
  }
};
var PauseRecording = class {
  constructor(status) {
    this.status = status;
    this.type = PAUSE_RECORDING;
  }
};
var StoreDevtoolsConfig = class {
  constructor() {
    this.maxAge = false;
  }
};
var STORE_DEVTOOLS_CONFIG = new InjectionToken("@ngrx/store-devtools Options");
var INITIAL_OPTIONS = new InjectionToken("@ngrx/store-devtools Initial Config");
function noMonitor() {
  return null;
}
var DEFAULT_NAME = "NgRx Store DevTools";
function createConfig(optionsInput) {
  const DEFAULT_OPTIONS = {
    maxAge: false,
    monitor: noMonitor,
    actionSanitizer: void 0,
    stateSanitizer: void 0,
    name: DEFAULT_NAME,
    serialize: false,
    logOnly: false,
    autoPause: false,
    trace: false,
    traceLimit: 75,
    // Add all features explicitly. This prevent buggy behavior for
    // options like "lock" which might otherwise not show up.
    features: {
      pause: true,
      // Start/pause recording of dispatched actions
      lock: true,
      // Lock/unlock dispatching actions and side effects
      persist: true,
      // Persist states on page reloading
      export: true,
      // Export history of actions in a file
      import: "custom",
      // Import history of actions from a file
      jump: true,
      // Jump back and forth (time travelling)
      skip: true,
      // Skip (cancel) actions
      reorder: true,
      // Drag and drop actions in the history list
      dispatch: true,
      // Dispatch custom actions or action creators
      test: true
      // Generate tests for the selected actions
    },
    connectInZone: false
  };
  const options = typeof optionsInput === "function" ? optionsInput() : optionsInput;
  const logOnly = options.logOnly ? {
    pause: true,
    export: true,
    test: true
  } : false;
  const features = options.features || logOnly || DEFAULT_OPTIONS.features;
  if (features.import === true) {
    features.import = "custom";
  }
  const config = Object.assign({}, DEFAULT_OPTIONS, {
    features
  }, options);
  if (config.maxAge && config.maxAge < 2) {
    throw new Error(`Devtools 'maxAge' cannot be less than 2, got ${config.maxAge}`);
  }
  return config;
}
function difference(first, second) {
  return first.filter((item) => second.indexOf(item) < 0);
}
function unliftState(liftedState) {
  const {
    computedStates,
    currentStateIndex
  } = liftedState;
  if (currentStateIndex >= computedStates.length) {
    const {
      state: state2
    } = computedStates[computedStates.length - 1];
    return state2;
  }
  const {
    state
  } = computedStates[currentStateIndex];
  return state;
}
function liftAction(action) {
  return new PerformAction(action, +Date.now());
}
function sanitizeActions(actionSanitizer, actions) {
  return Object.keys(actions).reduce((sanitizedActions, actionIdx) => {
    const idx = Number(actionIdx);
    sanitizedActions[idx] = sanitizeAction(actionSanitizer, actions[idx], idx);
    return sanitizedActions;
  }, {});
}
function sanitizeAction(actionSanitizer, action, actionIdx) {
  return __spreadProps(__spreadValues({}, action), {
    action: actionSanitizer(action.action, actionIdx)
  });
}
function sanitizeStates(stateSanitizer, states) {
  return states.map((computedState, idx) => ({
    state: sanitizeState(stateSanitizer, computedState.state, idx),
    error: computedState.error
  }));
}
function sanitizeState(stateSanitizer, state, stateIdx) {
  return stateSanitizer(state, stateIdx);
}
function shouldFilterActions(config) {
  return config.predicate || config.actionsSafelist || config.actionsBlocklist;
}
function filterLiftedState(liftedState, predicate, safelist, blocklist) {
  const filteredStagedActionIds = [];
  const filteredActionsById = {};
  const filteredComputedStates = [];
  liftedState.stagedActionIds.forEach((id, idx) => {
    const liftedAction = liftedState.actionsById[id];
    if (!liftedAction) return;
    if (idx && isActionFiltered(liftedState.computedStates[idx], liftedAction, predicate, safelist, blocklist)) {
      return;
    }
    filteredActionsById[id] = liftedAction;
    filteredStagedActionIds.push(id);
    filteredComputedStates.push(liftedState.computedStates[idx]);
  });
  return __spreadProps(__spreadValues({}, liftedState), {
    stagedActionIds: filteredStagedActionIds,
    actionsById: filteredActionsById,
    computedStates: filteredComputedStates
  });
}
function isActionFiltered(state, action, predicate, safelist, blockedlist) {
  const predicateMatch = predicate && !predicate(state, action.action);
  const safelistMatch = safelist && !action.action.type.match(safelist.map((s) => escapeRegExp(s)).join("|"));
  const blocklistMatch = blockedlist && action.action.type.match(blockedlist.map((s) => escapeRegExp(s)).join("|"));
  return predicateMatch || safelistMatch || blocklistMatch;
}
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function injectZoneConfig(connectInZone) {
  const ngZone = connectInZone ? inject(NgZone) : null;
  return {
    ngZone,
    connectInZone
  };
}
var _DevtoolsDispatcher = class _DevtoolsDispatcher extends ActionsSubject {
};
_DevtoolsDispatcher.ɵfac = /* @__PURE__ */ (() => {
  let ɵDevtoolsDispatcher_BaseFactory;
  return function DevtoolsDispatcher_Factory(__ngFactoryType__) {
    return (ɵDevtoolsDispatcher_BaseFactory || (ɵDevtoolsDispatcher_BaseFactory = ɵɵgetInheritedFactory(_DevtoolsDispatcher)))(__ngFactoryType__ || _DevtoolsDispatcher);
  };
})();
_DevtoolsDispatcher.ɵprov = ɵɵdefineInjectable({
  token: _DevtoolsDispatcher,
  factory: _DevtoolsDispatcher.ɵfac
});
var DevtoolsDispatcher = _DevtoolsDispatcher;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(DevtoolsDispatcher, [{
    type: Injectable
  }], null, null);
})();
var ExtensionActionTypes = {
  START: "START",
  DISPATCH: "DISPATCH",
  STOP: "STOP",
  ACTION: "ACTION"
};
var REDUX_DEVTOOLS_EXTENSION = new InjectionToken("@ngrx/store-devtools Redux Devtools Extension");
var _DevtoolsExtension = class _DevtoolsExtension {
  constructor(devtoolsExtension, config, dispatcher) {
    this.config = config;
    this.dispatcher = dispatcher;
    this.zoneConfig = injectZoneConfig(this.config.connectInZone);
    this.devtoolsExtension = devtoolsExtension;
    this.createActionStreams();
  }
  notify(action, state) {
    if (!this.devtoolsExtension) {
      return;
    }
    if (action.type === PERFORM_ACTION) {
      if (state.isLocked || state.isPaused) {
        return;
      }
      const currentState = unliftState(state);
      if (shouldFilterActions(this.config) && isActionFiltered(currentState, action, this.config.predicate, this.config.actionsSafelist, this.config.actionsBlocklist)) {
        return;
      }
      const sanitizedState = this.config.stateSanitizer ? sanitizeState(this.config.stateSanitizer, currentState, state.currentStateIndex) : currentState;
      const sanitizedAction = this.config.actionSanitizer ? sanitizeAction(this.config.actionSanitizer, action, state.nextActionId) : action;
      this.sendToReduxDevtools(() => this.extensionConnection.send(sanitizedAction, sanitizedState));
    } else {
      const sanitizedLiftedState = __spreadProps(__spreadValues({}, state), {
        stagedActionIds: state.stagedActionIds,
        actionsById: this.config.actionSanitizer ? sanitizeActions(this.config.actionSanitizer, state.actionsById) : state.actionsById,
        computedStates: this.config.stateSanitizer ? sanitizeStates(this.config.stateSanitizer, state.computedStates) : state.computedStates
      });
      this.sendToReduxDevtools(() => this.devtoolsExtension.send(null, sanitizedLiftedState, this.getExtensionConfig(this.config)));
    }
  }
  createChangesObservable() {
    if (!this.devtoolsExtension) {
      return EMPTY;
    }
    return new Observable((subscriber) => {
      const connection = this.zoneConfig.connectInZone ? (
        // To reduce change detection cycles, we need to run the `connect` method
        // outside of the Angular zone. The `connect` method adds a `message`
        // event listener to communicate with an extension using `window.postMessage`
        // and handle message events.
        this.zoneConfig.ngZone.runOutsideAngular(() => this.devtoolsExtension.connect(this.getExtensionConfig(this.config)))
      ) : this.devtoolsExtension.connect(this.getExtensionConfig(this.config));
      this.extensionConnection = connection;
      connection.init();
      connection.subscribe((change) => subscriber.next(change));
      return connection.unsubscribe;
    });
  }
  createActionStreams() {
    const changes$ = this.createChangesObservable().pipe(share());
    const start$ = changes$.pipe(filter((change) => change.type === ExtensionActionTypes.START));
    const stop$ = changes$.pipe(filter((change) => change.type === ExtensionActionTypes.STOP));
    const liftedActions$ = changes$.pipe(filter((change) => change.type === ExtensionActionTypes.DISPATCH), map((change) => this.unwrapAction(change.payload)), concatMap((action) => {
      if (action.type === IMPORT_STATE) {
        return this.dispatcher.pipe(filter((action2) => action2.type === UPDATE), timeout(1e3), debounceTime(1e3), map(() => action), catchError(() => of(action)), take(1));
      } else {
        return of(action);
      }
    }));
    const actions$ = changes$.pipe(filter((change) => change.type === ExtensionActionTypes.ACTION), map((change) => this.unwrapAction(change.payload)));
    const actionsUntilStop$ = actions$.pipe(takeUntil(stop$));
    const liftedUntilStop$ = liftedActions$.pipe(takeUntil(stop$));
    this.start$ = start$.pipe(takeUntil(stop$));
    this.actions$ = this.start$.pipe(switchMap(() => actionsUntilStop$));
    this.liftedActions$ = this.start$.pipe(switchMap(() => liftedUntilStop$));
  }
  unwrapAction(action) {
    return typeof action === "string" ? (0, eval)(`(${action})`) : action;
  }
  getExtensionConfig(config) {
    const extensionOptions = {
      name: config.name,
      features: config.features,
      serialize: config.serialize,
      autoPause: config.autoPause ?? false,
      trace: config.trace ?? false,
      traceLimit: config.traceLimit ?? 75
      // The action/state sanitizers are not added to the config
      // because sanitation is done in this class already.
      // It is done before sending it to the devtools extension for consistency:
      // - If we call extensionConnection.send(...),
      //   the extension would call the sanitizers.
      // - If we call devtoolsExtension.send(...) (aka full state update),
      //   the extension would NOT call the sanitizers, so we have to do it ourselves.
    };
    if (config.maxAge !== false) {
      extensionOptions.maxAge = config.maxAge;
    }
    return extensionOptions;
  }
  sendToReduxDevtools(send) {
    try {
      send();
    } catch (err) {
      console.warn("@ngrx/store-devtools: something went wrong inside the redux devtools", err);
    }
  }
};
_DevtoolsExtension.ɵfac = function DevtoolsExtension_Factory(__ngFactoryType__) {
  return new (__ngFactoryType__ || _DevtoolsExtension)(ɵɵinject(REDUX_DEVTOOLS_EXTENSION), ɵɵinject(STORE_DEVTOOLS_CONFIG), ɵɵinject(DevtoolsDispatcher));
};
_DevtoolsExtension.ɵprov = ɵɵdefineInjectable({
  token: _DevtoolsExtension,
  factory: _DevtoolsExtension.ɵfac
});
var DevtoolsExtension = _DevtoolsExtension;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(DevtoolsExtension, [{
    type: Injectable
  }], () => [{
    type: void 0,
    decorators: [{
      type: Inject,
      args: [REDUX_DEVTOOLS_EXTENSION]
    }]
  }, {
    type: StoreDevtoolsConfig,
    decorators: [{
      type: Inject,
      args: [STORE_DEVTOOLS_CONFIG]
    }]
  }, {
    type: DevtoolsDispatcher
  }], null);
})();
var INIT_ACTION = {
  type: INIT
};
var RECOMPUTE = "@ngrx/store-devtools/recompute";
var RECOMPUTE_ACTION = {
  type: RECOMPUTE
};
function computeNextEntry(reducer, action, state, error, errorHandler) {
  if (error) {
    return {
      state,
      error: "Interrupted by an error up the chain"
    };
  }
  let nextState = state;
  let nextError;
  try {
    nextState = reducer(state, action);
  } catch (err) {
    nextError = err.toString();
    errorHandler.handleError(err);
  }
  return {
    state: nextState,
    error: nextError
  };
}
function recomputeStates(computedStates, minInvalidatedStateIndex, reducer, committedState, actionsById, stagedActionIds, skippedActionIds, errorHandler, isPaused) {
  if (minInvalidatedStateIndex >= computedStates.length && computedStates.length === stagedActionIds.length) {
    return computedStates;
  }
  const nextComputedStates = computedStates.slice(0, minInvalidatedStateIndex);
  const lastIncludedActionId = stagedActionIds.length - (isPaused ? 1 : 0);
  for (let i = minInvalidatedStateIndex; i < lastIncludedActionId; i++) {
    const actionId = stagedActionIds[i];
    const action = actionsById[actionId].action;
    const previousEntry = nextComputedStates[i - 1];
    const previousState = previousEntry ? previousEntry.state : committedState;
    const previousError = previousEntry ? previousEntry.error : void 0;
    const shouldSkip = skippedActionIds.indexOf(actionId) > -1;
    const entry = shouldSkip ? previousEntry : computeNextEntry(reducer, action, previousState, previousError, errorHandler);
    nextComputedStates.push(entry);
  }
  if (isPaused) {
    nextComputedStates.push(computedStates[computedStates.length - 1]);
  }
  return nextComputedStates;
}
function liftInitialState(initialCommittedState, monitorReducer) {
  return {
    monitorState: monitorReducer(void 0, {}),
    nextActionId: 1,
    actionsById: {
      0: liftAction(INIT_ACTION)
    },
    stagedActionIds: [0],
    skippedActionIds: [],
    committedState: initialCommittedState,
    currentStateIndex: 0,
    computedStates: [],
    isLocked: false,
    isPaused: false
  };
}
function liftReducerWith(initialCommittedState, initialLiftedState, errorHandler, monitorReducer, options = {}) {
  return (reducer) => (liftedState, liftedAction) => {
    let {
      monitorState,
      actionsById,
      nextActionId,
      stagedActionIds,
      skippedActionIds,
      committedState,
      currentStateIndex,
      computedStates,
      isLocked,
      isPaused
    } = liftedState || initialLiftedState;
    if (!liftedState) {
      actionsById = Object.create(actionsById);
    }
    function commitExcessActions(n) {
      let excess = n;
      let idsToDelete = stagedActionIds.slice(1, excess + 1);
      for (let i = 0; i < idsToDelete.length; i++) {
        if (computedStates[i + 1].error) {
          excess = i;
          idsToDelete = stagedActionIds.slice(1, excess + 1);
          break;
        } else {
          delete actionsById[idsToDelete[i]];
        }
      }
      skippedActionIds = skippedActionIds.filter((id) => idsToDelete.indexOf(id) === -1);
      stagedActionIds = [0, ...stagedActionIds.slice(excess + 1)];
      committedState = computedStates[excess].state;
      computedStates = computedStates.slice(excess);
      currentStateIndex = currentStateIndex > excess ? currentStateIndex - excess : 0;
    }
    function commitChanges() {
      actionsById = {
        0: liftAction(INIT_ACTION)
      };
      nextActionId = 1;
      stagedActionIds = [0];
      skippedActionIds = [];
      committedState = computedStates[currentStateIndex].state;
      currentStateIndex = 0;
      computedStates = [];
    }
    let minInvalidatedStateIndex = 0;
    switch (liftedAction.type) {
      case LOCK_CHANGES: {
        isLocked = liftedAction.status;
        minInvalidatedStateIndex = Infinity;
        break;
      }
      case PAUSE_RECORDING: {
        isPaused = liftedAction.status;
        if (isPaused) {
          stagedActionIds = [...stagedActionIds, nextActionId];
          actionsById[nextActionId] = new PerformAction({
            type: "@ngrx/devtools/pause"
          }, +Date.now());
          nextActionId++;
          minInvalidatedStateIndex = stagedActionIds.length - 1;
          computedStates = computedStates.concat(computedStates[computedStates.length - 1]);
          if (currentStateIndex === stagedActionIds.length - 2) {
            currentStateIndex++;
          }
          minInvalidatedStateIndex = Infinity;
        } else {
          commitChanges();
        }
        break;
      }
      case RESET: {
        actionsById = {
          0: liftAction(INIT_ACTION)
        };
        nextActionId = 1;
        stagedActionIds = [0];
        skippedActionIds = [];
        committedState = initialCommittedState;
        currentStateIndex = 0;
        computedStates = [];
        break;
      }
      case COMMIT: {
        commitChanges();
        break;
      }
      case ROLLBACK: {
        actionsById = {
          0: liftAction(INIT_ACTION)
        };
        nextActionId = 1;
        stagedActionIds = [0];
        skippedActionIds = [];
        currentStateIndex = 0;
        computedStates = [];
        break;
      }
      case TOGGLE_ACTION: {
        const {
          id: actionId
        } = liftedAction;
        const index = skippedActionIds.indexOf(actionId);
        if (index === -1) {
          skippedActionIds = [actionId, ...skippedActionIds];
        } else {
          skippedActionIds = skippedActionIds.filter((id) => id !== actionId);
        }
        minInvalidatedStateIndex = stagedActionIds.indexOf(actionId);
        break;
      }
      case SET_ACTIONS_ACTIVE: {
        const {
          start,
          end,
          active
        } = liftedAction;
        const actionIds = [];
        for (let i = start; i < end; i++) actionIds.push(i);
        if (active) {
          skippedActionIds = difference(skippedActionIds, actionIds);
        } else {
          skippedActionIds = [...skippedActionIds, ...actionIds];
        }
        minInvalidatedStateIndex = stagedActionIds.indexOf(start);
        break;
      }
      case JUMP_TO_STATE: {
        currentStateIndex = liftedAction.index;
        minInvalidatedStateIndex = Infinity;
        break;
      }
      case JUMP_TO_ACTION: {
        const index = stagedActionIds.indexOf(liftedAction.actionId);
        if (index !== -1) currentStateIndex = index;
        minInvalidatedStateIndex = Infinity;
        break;
      }
      case SWEEP: {
        stagedActionIds = difference(stagedActionIds, skippedActionIds);
        skippedActionIds = [];
        currentStateIndex = Math.min(currentStateIndex, stagedActionIds.length - 1);
        break;
      }
      case PERFORM_ACTION: {
        if (isLocked) {
          return liftedState || initialLiftedState;
        }
        if (isPaused || liftedState && isActionFiltered(liftedState.computedStates[currentStateIndex], liftedAction, options.predicate, options.actionsSafelist, options.actionsBlocklist)) {
          const lastState = computedStates[computedStates.length - 1];
          computedStates = [...computedStates.slice(0, -1), computeNextEntry(reducer, liftedAction.action, lastState.state, lastState.error, errorHandler)];
          minInvalidatedStateIndex = Infinity;
          break;
        }
        if (options.maxAge && stagedActionIds.length === options.maxAge) {
          commitExcessActions(1);
        }
        if (currentStateIndex === stagedActionIds.length - 1) {
          currentStateIndex++;
        }
        const actionId = nextActionId++;
        actionsById[actionId] = liftedAction;
        stagedActionIds = [...stagedActionIds, actionId];
        minInvalidatedStateIndex = stagedActionIds.length - 1;
        break;
      }
      case IMPORT_STATE: {
        ({
          monitorState,
          actionsById,
          nextActionId,
          stagedActionIds,
          skippedActionIds,
          committedState,
          currentStateIndex,
          computedStates,
          isLocked,
          isPaused
        } = liftedAction.nextLiftedState);
        break;
      }
      case INIT: {
        minInvalidatedStateIndex = 0;
        if (options.maxAge && stagedActionIds.length > options.maxAge) {
          computedStates = recomputeStates(computedStates, minInvalidatedStateIndex, reducer, committedState, actionsById, stagedActionIds, skippedActionIds, errorHandler, isPaused);
          commitExcessActions(stagedActionIds.length - options.maxAge);
          minInvalidatedStateIndex = Infinity;
        }
        break;
      }
      case UPDATE: {
        const stateHasErrors = computedStates.filter((state) => state.error).length > 0;
        if (stateHasErrors) {
          minInvalidatedStateIndex = 0;
          if (options.maxAge && stagedActionIds.length > options.maxAge) {
            computedStates = recomputeStates(computedStates, minInvalidatedStateIndex, reducer, committedState, actionsById, stagedActionIds, skippedActionIds, errorHandler, isPaused);
            commitExcessActions(stagedActionIds.length - options.maxAge);
            minInvalidatedStateIndex = Infinity;
          }
        } else {
          if (!isPaused && !isLocked) {
            if (currentStateIndex === stagedActionIds.length - 1) {
              currentStateIndex++;
            }
            const actionId = nextActionId++;
            actionsById[actionId] = new PerformAction(liftedAction, +Date.now());
            stagedActionIds = [...stagedActionIds, actionId];
            minInvalidatedStateIndex = stagedActionIds.length - 1;
            computedStates = recomputeStates(computedStates, minInvalidatedStateIndex, reducer, committedState, actionsById, stagedActionIds, skippedActionIds, errorHandler, isPaused);
          }
          computedStates = computedStates.map((cmp) => __spreadProps(__spreadValues({}, cmp), {
            state: reducer(cmp.state, RECOMPUTE_ACTION)
          }));
          currentStateIndex = stagedActionIds.length - 1;
          if (options.maxAge && stagedActionIds.length > options.maxAge) {
            commitExcessActions(stagedActionIds.length - options.maxAge);
          }
          minInvalidatedStateIndex = Infinity;
        }
        break;
      }
      default: {
        minInvalidatedStateIndex = Infinity;
        break;
      }
    }
    computedStates = recomputeStates(computedStates, minInvalidatedStateIndex, reducer, committedState, actionsById, stagedActionIds, skippedActionIds, errorHandler, isPaused);
    monitorState = monitorReducer(monitorState, liftedAction);
    return {
      monitorState,
      actionsById,
      nextActionId,
      stagedActionIds,
      skippedActionIds,
      committedState,
      currentStateIndex,
      computedStates,
      isLocked,
      isPaused
    };
  };
}
var _StoreDevtools = class _StoreDevtools {
  constructor(dispatcher, actions$, reducers$, extension, scannedActions, errorHandler, initialState, config) {
    const liftedInitialState = liftInitialState(initialState, config.monitor);
    const liftReducer = liftReducerWith(initialState, liftedInitialState, errorHandler, config.monitor, config);
    const liftedAction$ = merge(merge(actions$.asObservable().pipe(skip(1)), extension.actions$).pipe(map(liftAction)), dispatcher, extension.liftedActions$).pipe(observeOn(queueScheduler));
    const liftedReducer$ = reducers$.pipe(map(liftReducer));
    const zoneConfig = injectZoneConfig(config.connectInZone);
    const liftedStateSubject = new ReplaySubject(1);
    this.liftedStateSubscription = liftedAction$.pipe(
      withLatestFrom(liftedReducer$),
      // The extension would post messages back outside of the Angular zone
      // because we call `connect()` wrapped with `runOutsideAngular`. We run change
      // detection only once at the end after all the required asynchronous tasks have
      // been processed (for instance, `setInterval` scheduled by the `timeout` operator).
      // We have to re-enter the Angular zone before the `scan` since it runs the reducer
      // which must be run within the Angular zone.
      emitInZone(zoneConfig),
      scan(({
        state: liftedState
      }, [action, reducer]) => {
        let reducedLiftedState = reducer(liftedState, action);
        if (action.type !== PERFORM_ACTION && shouldFilterActions(config)) {
          reducedLiftedState = filterLiftedState(reducedLiftedState, config.predicate, config.actionsSafelist, config.actionsBlocklist);
        }
        extension.notify(action, reducedLiftedState);
        return {
          state: reducedLiftedState,
          action
        };
      }, {
        state: liftedInitialState,
        action: null
      })
    ).subscribe(({
      state,
      action
    }) => {
      liftedStateSubject.next(state);
      if (action.type === PERFORM_ACTION) {
        const unliftedAction = action.action;
        scannedActions.next(unliftedAction);
      }
    });
    this.extensionStartSubscription = extension.start$.pipe(emitInZone(zoneConfig)).subscribe(() => {
      this.refresh();
    });
    const liftedState$ = liftedStateSubject.asObservable();
    const state$ = liftedState$.pipe(map(unliftState));
    Object.defineProperty(state$, "state", {
      value: toSignal(state$, {
        manualCleanup: true,
        requireSync: true
      })
    });
    this.dispatcher = dispatcher;
    this.liftedState = liftedState$;
    this.state = state$;
  }
  ngOnDestroy() {
    this.liftedStateSubscription.unsubscribe();
    this.extensionStartSubscription.unsubscribe();
  }
  dispatch(action) {
    this.dispatcher.next(action);
  }
  next(action) {
    this.dispatcher.next(action);
  }
  error(error) {
  }
  complete() {
  }
  performAction(action) {
    this.dispatch(new PerformAction(action, +Date.now()));
  }
  refresh() {
    this.dispatch(new Refresh());
  }
  reset() {
    this.dispatch(new Reset(+Date.now()));
  }
  rollback() {
    this.dispatch(new Rollback(+Date.now()));
  }
  commit() {
    this.dispatch(new Commit(+Date.now()));
  }
  sweep() {
    this.dispatch(new Sweep());
  }
  toggleAction(id) {
    this.dispatch(new ToggleAction(id));
  }
  jumpToAction(actionId) {
    this.dispatch(new JumpToAction(actionId));
  }
  jumpToState(index) {
    this.dispatch(new JumpToState(index));
  }
  importState(nextLiftedState) {
    this.dispatch(new ImportState(nextLiftedState));
  }
  lockChanges(status) {
    this.dispatch(new LockChanges(status));
  }
  pauseRecording(status) {
    this.dispatch(new PauseRecording(status));
  }
};
_StoreDevtools.ɵfac = function StoreDevtools_Factory(__ngFactoryType__) {
  return new (__ngFactoryType__ || _StoreDevtools)(ɵɵinject(DevtoolsDispatcher), ɵɵinject(ActionsSubject), ɵɵinject(ReducerObservable), ɵɵinject(DevtoolsExtension), ɵɵinject(ScannedActionsSubject), ɵɵinject(ErrorHandler), ɵɵinject(INITIAL_STATE), ɵɵinject(STORE_DEVTOOLS_CONFIG));
};
_StoreDevtools.ɵprov = ɵɵdefineInjectable({
  token: _StoreDevtools,
  factory: _StoreDevtools.ɵfac
});
var StoreDevtools = _StoreDevtools;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(StoreDevtools, [{
    type: Injectable
  }], () => [{
    type: DevtoolsDispatcher
  }, {
    type: ActionsSubject
  }, {
    type: ReducerObservable
  }, {
    type: DevtoolsExtension
  }, {
    type: ScannedActionsSubject
  }, {
    type: ErrorHandler
  }, {
    type: void 0,
    decorators: [{
      type: Inject,
      args: [INITIAL_STATE]
    }]
  }, {
    type: StoreDevtoolsConfig,
    decorators: [{
      type: Inject,
      args: [STORE_DEVTOOLS_CONFIG]
    }]
  }], null);
})();
function emitInZone({
  ngZone,
  connectInZone
}) {
  return (source) => connectInZone ? new Observable((subscriber) => source.subscribe({
    next: (value) => ngZone.run(() => subscriber.next(value)),
    error: (error) => ngZone.run(() => subscriber.error(error)),
    complete: () => ngZone.run(() => subscriber.complete())
  })) : source;
}
var IS_EXTENSION_OR_MONITOR_PRESENT = new InjectionToken("@ngrx/store-devtools Is Devtools Extension or Monitor Present");
function createIsExtensionOrMonitorPresent(extension, config) {
  return Boolean(extension) || config.monitor !== noMonitor;
}
function createReduxDevtoolsExtension() {
  const extensionKey = "__REDUX_DEVTOOLS_EXTENSION__";
  if (typeof window === "object" && typeof window[extensionKey] !== "undefined") {
    return window[extensionKey];
  } else {
    return null;
  }
}
function createStateObservable(devtools) {
  return devtools.state;
}
function provideStoreDevtools(options = {}) {
  return makeEnvironmentProviders([DevtoolsExtension, DevtoolsDispatcher, StoreDevtools, {
    provide: INITIAL_OPTIONS,
    useValue: options
  }, {
    provide: IS_EXTENSION_OR_MONITOR_PRESENT,
    deps: [REDUX_DEVTOOLS_EXTENSION, STORE_DEVTOOLS_CONFIG],
    useFactory: createIsExtensionOrMonitorPresent
  }, {
    provide: REDUX_DEVTOOLS_EXTENSION,
    useFactory: createReduxDevtoolsExtension
  }, {
    provide: STORE_DEVTOOLS_CONFIG,
    deps: [INITIAL_OPTIONS],
    useFactory: createConfig
  }, {
    provide: StateObservable,
    deps: [StoreDevtools],
    useFactory: createStateObservable
  }, {
    provide: ReducerManagerDispatcher,
    useExisting: DevtoolsDispatcher
  }]);
}
var _StoreDevtoolsModule = class _StoreDevtoolsModule {
  static instrument(options = {}) {
    return {
      ngModule: _StoreDevtoolsModule,
      providers: [provideStoreDevtools(options)]
    };
  }
};
_StoreDevtoolsModule.ɵfac = function StoreDevtoolsModule_Factory(__ngFactoryType__) {
  return new (__ngFactoryType__ || _StoreDevtoolsModule)();
};
_StoreDevtoolsModule.ɵmod = ɵɵdefineNgModule({
  type: _StoreDevtoolsModule
});
_StoreDevtoolsModule.ɵinj = ɵɵdefineInjector({});
var StoreDevtoolsModule = _StoreDevtoolsModule;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(StoreDevtoolsModule, [{
    type: NgModule,
    args: [{}]
  }], null, null);
})();
export {
  INITIAL_OPTIONS,
  RECOMPUTE,
  REDUX_DEVTOOLS_EXTENSION,
  StoreDevtools,
  StoreDevtoolsConfig,
  StoreDevtoolsModule,
  provideStoreDevtools
};
//# sourceMappingURL=@ngrx_store-devtools.js.map
