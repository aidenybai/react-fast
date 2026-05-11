export {
  // Core runtime
  template,
  delegateEvents,
  clearDelegatedEvents,
  insert,
  reconcileArrays,
  spread,
  assign,
  use,
  mergeProps,
  dynamicProperty,

  // Effect / reactivity (injectable)
  effect,
  untrack,
  setRuntime,

  // Properties
  setProperty,
  setAttribute,
  setAttributeNS,
  setBoolAttribute,
  className,
  addEventListener,
  classList,
  style,
  setStyleProperty,

  // SSR
  escape,

  // Constants
  Properties,
  ChildProperties,
  getPropAlias,
  Aliases,
  SVGNamespace,
  DelegatedEvents,
} from "./client.js";
