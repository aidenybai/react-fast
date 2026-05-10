import * as t from "@babel/types";
import {
  DELEGATED_EVENTS,
  REACT_EVENT_MAP,
  REACT_INPUT_EVENTS,
  BOOLEAN_ATTRIBUTES,
  PROPERTY_ALIASES,
} from "./shared/constants.js";
import {
  getAttributeName,
  getAttributeValue,
  isStaticExpression,
  isDynamic,
} from "./shared/utils.js";
import type { DynamicHole } from "./generate-template.js";

export interface ElementProcessingResult {
  staticAttrs: Array<{ name: string; value: string }>;
  dynamics: DynamicHole[];
}

export const processElementAttributes = (
  node: t.JSXElement,
  isSVG: boolean,
): ElementProcessingResult => {
  const staticAttrs: Array<{ name: string; value: string }> = [];
  const dynamics: DynamicHole[] = [];
  const attributes = node.openingElement.attributes;
  const tagName = t.isJSXIdentifier(node.openingElement.name)
    ? node.openingElement.name.name
    : "";

  for (const attr of attributes) {
    if (t.isJSXSpreadAttribute(attr)) {
      dynamics.push({
        walkPath: [],
        kind: "spread",
        expression: attr.argument,
      });
      continue;
    }

    const attrName = getAttributeName(attr);
    const value = getAttributeValue(attr);

    if (attrName === "ref") {
      if (value) {
        dynamics.push({ walkPath: [], kind: "ref", expression: value });
      }
      continue;
    }

    if (attrName === "key" || attrName === "children") continue;

    if (attrName === "style" && value && !t.isStringLiteral(value)) {
      dynamics.push({ walkPath: [], kind: "style", name: "style", expression: value });
      continue;
    }

    if (attrName === "classList" && value) {
      dynamics.push({ walkPath: [], kind: "classList", name: "classList", expression: value });
      continue;
    }

    if (attrName.startsWith("on") && attrName.length > 2 && attrName[2] === attrName[2]!.toUpperCase()) {
      if (value) {
        let eventName: string;

        if (REACT_INPUT_EVENTS[attrName] && isInputLike(tagName)) {
          eventName = REACT_INPUT_EVENTS[attrName]!;
        } else if (REACT_EVENT_MAP[attrName]) {
          eventName = REACT_EVENT_MAP[attrName]!;
        } else {
          eventName = attrName.slice(2).toLowerCase();
        }

        const isDelegated = DELEGATED_EVENTS.has(eventName);
        dynamics.push({
          walkPath: [],
          kind: "event",
          name: eventName,
          expression: value,
          isDelegated,
        });
      }
      continue;
    }

    if (attrName === "dangerouslySetInnerHTML" && value) {
      dynamics.push({
        walkPath: [],
        kind: "attribute",
        name: "innerHTML",
        expression: t.memberExpression(value, t.identifier("__html")),
      });
      continue;
    }

    if (value && isStaticExpression(value)) {
      const resolvedName = PROPERTY_ALIASES[attrName] || attrName;
      if (t.isStringLiteral(value)) {
        staticAttrs.push({ name: resolvedName, value: value.value });
      } else if (t.isBooleanLiteral(value) && value.value) {
        staticAttrs.push({ name: resolvedName, value: "" });
      }
      continue;
    }

    if (value) {
      const isAttribute = isSVG || attrName.includes("-") || BOOLEAN_ATTRIBUTES.has(attrName.toLowerCase());
      const resolvedName = isAttribute ? (PROPERTY_ALIASES[attrName] || attrName) : attrName;
      dynamics.push({
        walkPath: [],
        kind: "attribute",
        name: resolvedName,
        expression: value,
        isAttribute,
      });
    }
  }

  return { staticAttrs, dynamics };
};

const isInputLike = (tagName: string): boolean => {
  return tagName === "input" || tagName === "textarea";
};
