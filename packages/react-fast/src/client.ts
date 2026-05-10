import {
  Properties,
  ChildProperties,
  Aliases,
  getPropAlias,
  SVGNamespace,
  DelegatedEvents,
} from "./constants.js";
import reconcileArrays from "./reconcile.js";

export { reconcileArrays };
export {
  Properties,
  ChildProperties,
  getPropAlias,
  Aliases,
  SVGNamespace,
  DelegatedEvents,
} from "./constants.js";

const DELEGATE_EVENTS_SYMBOL = "_$DX_DELEGATE";

interface EffectFn {
  <T>(fn: (prev: T) => T, init?: T): void;
}

interface UntrackFn {
  <T>(fn: () => T): T;
}

let _effect: EffectFn = (fn, init) => {
  fn(init!);
};
let _untrack: UntrackFn = (fn) => fn();

export const setRuntime = (runtime: { effect?: EffectFn; untrack?: UntrackFn }): void => {
  if (runtime.effect) _effect = runtime.effect;
  if (runtime.untrack) _untrack = runtime.untrack;
};

export const effect = <T>(fn: (prev: T) => T, init?: T): void => {
  _effect(fn, init);
};

export const untrack = <T>(fn: () => T): T => {
  return _untrack(fn);
};

// --- Template ---

export const template = (
  html: string,
  isImportNode?: boolean,
  isSVG?: boolean,
  isMathML?: boolean,
) => {
  let cachedNode: Node;
  const createNode = () => {
    const templateElement = isMathML
      ? document.createElementNS("http://www.w3.org/1998/Math/MathML", "template")
      : document.createElement("template");
    templateElement.innerHTML = html;
    return isSVG
      ? (templateElement as HTMLTemplateElement).content.firstChild!.firstChild!
      : isMathML
        ? templateElement.firstChild!
        : (templateElement as HTMLTemplateElement).content.firstChild!;
  };
  const cloneFactory = isImportNode
    ? () => _untrack(() => document.importNode(cachedNode || (cachedNode = createNode()), true))
    : () => (cachedNode || (cachedNode = createNode())).cloneNode(true);
  (cloneFactory as unknown as Record<string, unknown>).cloneNode = cloneFactory;
  return cloneFactory;
};

// --- Event Delegation ---

export const delegateEvents = (eventNames: string[], targetDocument: Document = document): void => {
  const docRecord = targetDocument as unknown as Record<string, unknown>;
  const registeredEvents: Set<string> =
    (docRecord[DELEGATE_EVENTS_SYMBOL] as Set<string>) ||
    (docRecord[DELEGATE_EVENTS_SYMBOL] = new Set());
  for (let index = 0, length = eventNames.length; index < length; index++) {
    const eventName = eventNames[index]!;
    if (!registeredEvents.has(eventName)) {
      registeredEvents.add(eventName);
      targetDocument.addEventListener(eventName, eventHandler);
    }
  }
};

export const clearDelegatedEvents = (targetDocument: Document = document): void => {
  const docRecord = targetDocument as unknown as Record<string, unknown>;
  const registeredEvents = docRecord[DELEGATE_EVENTS_SYMBOL] as Set<string> | undefined;
  if (registeredEvents) {
    for (const eventName of registeredEvents.keys())
      targetDocument.removeEventListener(eventName, eventHandler);
    delete docRecord[DELEGATE_EVENTS_SYMBOL];
  }
};

// --- Properties ---

export const setProperty = (node: Record<string, unknown>, name: string, value: unknown): void => {
  node[name] = value;
};

export const setAttribute = (node: Element, name: string, value: unknown): void => {
  if (value == null) node.removeAttribute(name);
  else node.setAttribute(name, value as string);
};

export const setAttributeNS = (
  node: Element,
  namespace: string,
  name: string,
  value: unknown,
): void => {
  if (value == null) node.removeAttributeNS(namespace, name);
  else node.setAttributeNS(namespace, name, value as string);
};

export const setBoolAttribute = (node: Element, name: string, value: unknown): void => {
  value ? node.setAttribute(name, "") : node.removeAttribute(name);
};

export const className = (node: Element, value: string | null | undefined): void => {
  if (value == null) node.removeAttribute("class");
  else node.className = value;
};

export const addEventListener = (
  node: Record<string, unknown>,
  name: string,
  handler: unknown,
  delegate: boolean,
): void => {
  if (delegate) {
    if (Array.isArray(handler)) {
      node[`$$${name}`] = handler[0];
      node[`$$${name}Data`] = handler[1];
    } else node[`$$${name}`] = handler;
  } else if (Array.isArray(handler)) {
    const originalHandler = handler[0];
    (node as unknown as HTMLElement).addEventListener(
      name,
      (handler[0] = (event: Event) => originalHandler.call(node, handler[1], event)),
    );
  } else {
    (node as unknown as HTMLElement).addEventListener(
      name,
      handler as EventListenerOrEventListenerObject,
      typeof handler !== "function" && (handler as AddEventListenerOptions),
    );
  }
};

export const classList = (
  node: Element,
  value: Record<string, boolean | undefined> | null | undefined,
  previousState: Record<string, boolean> = {},
): Record<string, boolean> => {
  const currentKeys = Object.keys(value || {});
  const previousKeys = Object.keys(previousState);

  for (let index = 0, length = previousKeys.length; index < length; index++) {
    const key = previousKeys[index]!;
    if (!key || key === "undefined" || (value as Record<string, unknown>)?.[key]) continue;
    toggleClassKey(node, key, false);
    delete (previousState as Record<string, unknown>)[key];
  }
  for (let index = 0, length = currentKeys.length; index < length; index++) {
    const key = currentKeys[index]!;
    const isActive = Boolean((value as Record<string, unknown>)[key]);
    if (
      !key ||
      key === "undefined" ||
      (previousState as Record<string, unknown>)[key] === isActive ||
      !isActive
    )
      continue;
    toggleClassKey(node, key, true);
    (previousState as Record<string, unknown>)[key] = isActive;
  }
  return previousState;
};

export const style = (
  node: HTMLElement,
  value: string | Record<string, string | number | null | undefined> | null | undefined,
  previousState?: string | Record<string, string | number | null | undefined>,
): unknown => {
  if (!value) return previousState ? setAttribute(node, "style", undefined) : value;
  const nodeStyle = node.style;
  if (typeof value === "string") return (nodeStyle.cssText = value);
  if (typeof previousState === "string") {
    nodeStyle.cssText = "";
    previousState = undefined;
  }
  const previousStyles = (previousState || {}) as Record<string, unknown>;
  const currentStyles = (value || {}) as Record<string, unknown>;
  for (const property in previousStyles) {
    if (currentStyles[property] == null) nodeStyle.removeProperty(property);
    delete previousStyles[property];
  }
  for (const property in currentStyles) {
    const propertyValue = currentStyles[property];
    if (propertyValue !== previousStyles[property]) {
      nodeStyle.setProperty(property, propertyValue as string);
      previousStyles[property] = propertyValue;
    }
  }
  return previousStyles;
};

export const setStyleProperty = (node: HTMLElement, name: string, value: string | null): void => {
  value != null ? node.style.setProperty(name, value) : node.style.removeProperty(name);
};

// --- Spread / Assign ---

export const spread = (
  node: Element,
  props: Record<string, unknown> = {},
  isSVG?: boolean,
  skipChildren?: boolean,
): Record<string, unknown> => {
  const previousProps: Record<string, unknown> = {};
  if (!skipChildren) {
    _effect(
      () =>
        (previousProps.children = insertExpression(
          node,
          props.children,
          previousProps.children,
          undefined,
        )),
    );
  }
  _effect(
    () =>
      typeof props.ref === "function" &&
      use(props.ref as (el: Element, arg?: unknown) => void, node),
  );
  _effect(() => assign(node, props, isSVG, true, previousProps, true));
  return previousProps;
};

export const use = (
  fn: (el: Element, arg?: unknown) => void,
  element: Element,
  arg?: unknown,
): unknown => {
  return _untrack(() => fn(element, arg));
};

// --- Insert ---

export const insert = (
  parent: Node,
  accessor: unknown,
  marker?: Node | null,
  initial?: unknown,
): unknown => {
  if (marker !== undefined && !initial) initial = [];
  if (typeof accessor !== "function") return insertExpression(parent, accessor, initial, marker);
  _effect(
    (current: unknown) => insertExpression(parent, (accessor as () => unknown)(), current, marker),
    initial,
  );
};

export const assign = (
  node: Element,
  props: Record<string, unknown> | null | undefined,
  isSVG?: boolean,
  skipChildren?: boolean,
  previousProps: Record<string, unknown> = {},
  skipRef = false,
): void => {
  props || (props = {});
  for (const prop in previousProps) {
    if (!(prop in props)) {
      if (prop === "children") continue;
      previousProps[prop] = assignProp(
        node,
        prop,
        null,
        previousProps[prop],
        isSVG,
        skipRef,
        props,
      );
    }
  }
  for (const prop in props) {
    if (prop === "children") {
      if (!skipChildren) insertExpression(node, props.children, undefined, undefined);
      continue;
    }
    const value = props[prop];
    previousProps[prop] = assignProp(node, prop, value, previousProps[prop], isSVG, skipRef, props);
  }
};

export const dynamicProperty = (
  props: Record<string, unknown>,
  key: string,
): Record<string, unknown> => {
  const source = props[key];
  Object.defineProperty(props, key, {
    get() {
      return (source as () => unknown)();
    },
    enumerable: true,
  });
  return props;
};

export const mergeProps = (...sources: Record<string, unknown>[]): Record<string, unknown> => {
  const target: Record<string, unknown> = {};
  for (let index = 0; index < sources.length; index++) {
    const source = sources[index]!;
    if (typeof source === "function") {
      const resolved = (source as () => Record<string, unknown>)();
      for (const key in resolved) {
        Object.defineProperty(target, key, {
          get() {
            return (source as () => Record<string, unknown>)()[key];
          },
          enumerable: true,
          configurable: true,
        });
      }
    } else {
      for (const key in source) {
        const descriptor = Object.getOwnPropertyDescriptor(source, key);
        if (descriptor) {
          if (descriptor.get) {
            Object.defineProperty(target, key, descriptor);
          } else {
            Object.defineProperty(target, key, {
              get() {
                return source[key];
              },
              enumerable: true,
              configurable: true,
            });
          }
        }
      }
    }
  }
  return target;
};

// --- Internal ---

const toggleClassKey = (node: Element, key: string, value: boolean): void => {
  const classNames = key.trim().split(/\s+/);
  for (let index = 0, length = classNames.length; index < length; index++)
    node.classList.toggle(classNames[index]!, value);
};

const toPropertyName = (name: string): string => {
  return name.toLowerCase().replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
};

const assignProp = (
  node: Element,
  prop: string,
  value: unknown,
  previousValue: unknown,
  isSVG?: boolean,
  skipRef?: boolean,
  props?: Record<string, unknown>,
): unknown => {
  const nodeRecord = node as unknown as Record<string, unknown>;
  let isCE: boolean,
    isProp: boolean,
    isChildProp: boolean,
    propAlias: string | undefined,
    forceProp: boolean;
  if (prop === "style")
    return style(
      node as HTMLElement,
      value as string | Record<string, string> | null,
      previousValue as string | Record<string, string>,
    );
  if (prop === "classList")
    return classList(
      node,
      value as Record<string, boolean>,
      previousValue as Record<string, boolean>,
    );
  if (value === previousValue) return previousValue;
  if (prop === "ref") {
    if (!skipRef) (value as (el: Element) => void)(node);
  } else if (prop.slice(0, 3) === "on:") {
    const eventName = prop.slice(3);
    previousValue &&
      (node as HTMLElement).removeEventListener(eventName, previousValue as EventListener);
    value && (node as HTMLElement).addEventListener(eventName, value as EventListener);
  } else if (prop.slice(0, 10) === "oncapture:") {
    const eventName = prop.slice(10);
    previousValue &&
      (node as HTMLElement).removeEventListener(eventName, previousValue as EventListener, true);
    value && (node as HTMLElement).addEventListener(eventName, value as EventListener, true);
  } else if (prop.slice(0, 2) === "on") {
    const eventName = prop.slice(2).toLowerCase();
    const isDelegated = DelegatedEvents.has(eventName);
    if (!isDelegated && previousValue) {
      const handlerToRemove = Array.isArray(previousValue) ? previousValue[0] : previousValue;
      (node as HTMLElement).removeEventListener(eventName, handlerToRemove as EventListener);
    }
    if (isDelegated || value) {
      addEventListener(nodeRecord, eventName, value, isDelegated);
      if (isDelegated) delegateEvents([eventName]);
    }
  } else if (prop.slice(0, 5) === "attr:") {
    setAttribute(node, prop.slice(5), value);
  } else if (prop.slice(0, 5) === "bool:") {
    setBoolAttribute(node, prop.slice(5), value);
  } else if (
    (forceProp = prop.slice(0, 5) === "prop:") ||
    (isChildProp = ChildProperties.has(prop)) ||
    (!isSVG &&
      ((propAlias = getPropAlias(prop, node.tagName)) || (isProp = Properties.has(prop)))) ||
    (isCE = node.nodeName.includes("-") || Boolean(props && "is" in props))
  ) {
    if (forceProp!) {
      prop = prop.slice(5);
      isProp! = true;
    }
    if (prop === "class" || prop === "className") className(node, value as string);
    else if (isCE! && !isProp! && !isChildProp!) nodeRecord[toPropertyName(prop)] = value;
    else nodeRecord[propAlias || prop] = value;
  } else {
    const namespace =
      isSVG && prop.indexOf(":") > -1 ? SVGNamespace[prop.split(":")[0]!] : undefined;
    if (namespace) setAttributeNS(node, namespace, prop, value);
    else setAttribute(node, Aliases[prop] || prop, value);
  }
  return value;
};

const eventHandler = (event: Event): void => {
  let currentNode = event.target as (Node & Record<string, unknown>) | null;
  const delegateKey = `$$${event.type}`;
  const originalTarget = event.target;
  const originalCurrentTarget = event.currentTarget;

  const retarget = (value: unknown) =>
    Object.defineProperty(event, "target", { configurable: true, value });

  const handleCurrentNode = (): boolean => {
    const handler = currentNode![delegateKey];
    if (handler && !(currentNode as unknown as HTMLButtonElement).disabled) {
      const handlerData = currentNode![`${delegateKey}Data`];
      handlerData !== undefined
        ? (handler as (data: unknown, event: Event) => void).call(currentNode, handlerData, event)
        : (handler as (event: Event) => void).call(currentNode, event);
      if (event.cancelBubble) return false;
    }
    if (
      (currentNode as Record<string, unknown>).host &&
      typeof (currentNode as Record<string, unknown>).host !== "string" &&
      !((currentNode as Record<string, unknown>).host as Record<string, unknown>)._$host &&
      (currentNode as unknown as Node).contains(event.target as Node)
    ) {
      retarget((currentNode as Record<string, unknown>).host);
    }
    return true;
  };

  const walkUpTree = () => {
    while (
      handleCurrentNode() &&
      (currentNode = ((currentNode as Record<string, unknown>)._$host ||
        (currentNode as unknown as Node).parentNode ||
        (currentNode as Record<string, unknown>).host) as (Node & Record<string, unknown>) | null)
    );
  };

  Object.defineProperty(event, "currentTarget", {
    configurable: true,
    get() {
      return currentNode || document;
    },
  });

  if (event.composedPath) {
    const composedPath = event.composedPath();
    retarget(composedPath[0]);
    for (let index = 0; index < composedPath.length - 2; index++) {
      currentNode = composedPath[index] as Node & Record<string, unknown>;
      if (!handleCurrentNode()) break;
      if ((currentNode as Record<string, unknown>)._$host) {
        currentNode = (currentNode as Record<string, unknown>)._$host as Node &
          Record<string, unknown>;
        walkUpTree();
        break;
      }
      if ((currentNode as unknown as Node).parentNode === originalCurrentTarget) {
        break;
      }
    }
  } else walkUpTree();

  retarget(originalTarget);
};

const insertExpression = (
  parent: unknown,
  value: unknown,
  current: unknown,
  marker?: Node | null,
  shouldUnwrapArray?: boolean,
): unknown => {
  while (typeof current === "function") current = (current as () => unknown)();
  if (value === current) return current;
  const valueType = typeof value;
  const hasMultipleSlots = marker !== undefined;
  const parentElement =
    (hasMultipleSlots && (current as Node[])[0] && (current as Node[])[0]!.parentNode) || parent;

  if (valueType === "string" || valueType === "number") {
    if (valueType === "number") {
      value = value!.toString();
      if (value === current) return current;
    }
    if (hasMultipleSlots) {
      let textNode = (current as Node[])[0];
      if (textNode && textNode.nodeType === 3) {
        if ((textNode as Text).data !== value) (textNode as Text).data = value as string;
      } else textNode = document.createTextNode(value as string);
      current = cleanChildren(parentElement as Node, current as Node[], marker!, textNode);
    } else {
      if (current !== "" && typeof current === "string") {
        current = ((parentElement as HTMLElement).firstChild as Text).data = value as string;
      } else current = (parentElement as HTMLElement).textContent = value as string;
    }
  } else if (value == null || valueType === "boolean") {
    current = cleanChildren(parentElement as Node, current as Node[], marker!);
  } else if (valueType === "function") {
    _effect(() => {
      let resolvedValue = (value as () => unknown)();
      while (typeof resolvedValue === "function")
        resolvedValue = (resolvedValue as () => unknown)();
      current = insertExpression(parent, resolvedValue, current, marker);
    });
    return () => current;
  } else if (Array.isArray(value)) {
    const normalizedArray: Node[] = [];
    const isCurrentArray = current && Array.isArray(current);
    if (normalizeIncomingArray(normalizedArray, value, current, shouldUnwrapArray)) {
      _effect(() => (current = insertExpression(parent, normalizedArray, current, marker, true)));
      return () => current;
    }
    if (normalizedArray.length === 0) {
      current = cleanChildren(parentElement as Node, current as Node[], marker!);
      if (hasMultipleSlots) return current;
    } else if (isCurrentArray) {
      if ((current as Node[]).length === 0) {
        appendNodes(parentElement as Node, normalizedArray, marker ?? null);
      } else
        reconcileArrays(
          parentElement as Node,
          current as ChildNode[],
          normalizedArray as ChildNode[],
        );
    } else {
      if (current) cleanChildren(parentElement as Node, current as Node[]);
      appendNodes(parentElement as Node, normalizedArray);
    }
    current = normalizedArray;
  } else if ((value as Node).nodeType) {
    if (Array.isArray(current)) {
      if (hasMultipleSlots)
        return (current = cleanChildren(parentElement as Node, current, marker!, value as Node));
      cleanChildren(parentElement as Node, current, null!, value as Node);
    } else if (current == null || current === "" || !(parentElement as HTMLElement).firstChild) {
      (parentElement as Node).appendChild(value as Node);
    } else (parentElement as Node).replaceChild(value as Node, (parentElement as Node).firstChild!);
    current = value;
  }

  return current;
};

const normalizeIncomingArray = (
  normalized: Node[],
  array: unknown[],
  current: unknown,
  shouldUnwrap?: boolean,
): boolean => {
  let hasDynamicContent = false;
  for (let index = 0, length = array.length; index < length; index++) {
    let item = array[index];
    const previousNode = current && (current as Node[])[normalized.length];

    if (item == null || item === true || item === false) {
      // skip nullish/boolean values
    } else if (typeof item === "object" && (item as Node).nodeType) {
      normalized.push(item as Node);
    } else if (Array.isArray(item)) {
      hasDynamicContent =
        normalizeIncomingArray(normalized, item, previousNode) || hasDynamicContent;
    } else if (typeof item === "function") {
      if (shouldUnwrap) {
        while (typeof item === "function") item = (item as () => unknown)();
        hasDynamicContent =
          normalizeIncomingArray(
            normalized,
            Array.isArray(item) ? item : [item],
            Array.isArray(previousNode) ? previousNode : [previousNode],
          ) || hasDynamicContent;
      } else {
        normalized.push(item as unknown as Node);
        hasDynamicContent = true;
      }
    } else {
      const textValue = String(item);
      if (
        previousNode &&
        (previousNode as Node).nodeType === 3 &&
        (previousNode as Text).data === textValue
      )
        normalized.push(previousNode as Node);
      else normalized.push(document.createTextNode(textValue));
    }
  }
  return hasDynamicContent;
};

const appendNodes = (parent: Node, nodeArray: Node[], marker: Node | null = null): void => {
  for (let index = 0, length = nodeArray.length; index < length; index++)
    parent.insertBefore(nodeArray[index]!, marker);
};

const cleanChildren = (
  parent: Node,
  current: Node[] | undefined,
  marker?: Node,
  replacement?: Node,
): Node[] | string => {
  if (marker === undefined) return ((parent as HTMLElement).textContent = "");
  const replacementNode = replacement || document.createTextNode("");
  if (current && current.length) {
    let didInsertReplacement = false;
    for (let index = current.length - 1; index >= 0; index--) {
      const existingNode = current[index]!;
      if (replacementNode !== existingNode) {
        const isChildOfParent = existingNode.parentNode === parent;
        if (!didInsertReplacement && !index)
          isChildOfParent
            ? parent.replaceChild(replacementNode, existingNode)
            : parent.insertBefore(replacementNode, marker);
        else if (isChildOfParent) (existingNode as ChildNode).remove();
      } else didInsertReplacement = true;
    }
  } else parent.insertBefore(replacementNode, marker);
  return [replacementNode];
};
