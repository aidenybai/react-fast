import * as t from "@babel/types";
import {
  VOID_ELEMENTS,
  PROPERTY_ALIASES,
  REACT_EVENT_MAP,
  REACT_INPUT_EVENTS,
  DELEGATED_EVENTS,
} from "./shared/constants.js";
import type { TemplateInfo, PluginState } from "./shared/types.js";
import {
  getTagName,
  isComponent,
  getAttributeName,
  getAttributeValue,
  isStaticExpression,
  escapeHtml,
  isSVGElement,
  trimWhitespace,
  wrapThunk,
  camelToKebab,
} from "./shared/utils.js";

export type { TemplateInfo };

export const registerTemplate = (
  html: string,
  isSVG: boolean,
  state: PluginState,
  isFragment = false,
): TemplateInfo => {
  const existing = state.templates.get(html);
  if (existing) return existing;

  state.templateCounter++;
  const info: TemplateInfo = {
    id: t.identifier(`_tmpl$${state.templateCounter}`),
    html,
    isSVG,
    isFragment,
  };
  state.templates.set(html, info);
  return info;
};

export interface TemplateWalkStep {
  method: "firstChild" | "nextSibling";
}

export interface DynamicHole {
  walkPath: TemplateWalkStep[];
  kind: "attribute" | "event" | "ref" | "spread" | "style" | "classList";
  name?: string;
  expression: t.Expression;
  isDelegated?: boolean;
  isAttribute?: boolean;
}

export interface InsertHole {
  walkPath: TemplateWalkStep[];
  expression: t.Expression;
}

export interface TemplateResult {
  html: string;
  isSVG: boolean;
  holes: DynamicHole[];
  inserts: InsertHole[];
}

export const buildTemplateHtml = (
  node: t.JSXElement,
  parentSVG = false,
  createElementCallee?: () => t.Expression,
): TemplateResult => {
  const tagName = getTagName(node);
  const isSVG = parentSVG || isSVGElement(tagName);
  const holes: DynamicHole[] = [];
  const inserts: InsertHole[] = [];

  let html = `<${tagName}`;
  const attributes = node.openingElement.attributes;

  for (const attr of attributes) {
    if (t.isJSXSpreadAttribute(attr)) {
      holes.push({
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
        holes.push({ walkPath: [], kind: "ref", expression: value });
      }
      continue;
    }

    if (attrName === "key" || attrName === "children") continue;

    if (attrName === "style" && value) {
      if (t.isStringLiteral(value)) {
        html += ` style="${escapeHtml(value.value, true)}"`;
        continue;
      }

      if (t.isObjectExpression(value)) {
        let inlinedStyle = "";
        const remainingProps: t.ObjectProperty[] = [];

        for (const prop of value.properties) {
          if (t.isObjectProperty(prop) && !prop.computed) {
            const key = t.isIdentifier(prop.key)
              ? prop.key.name
              : t.isStringLiteral(prop.key)
                ? prop.key.value
                : null;
            if (key && t.isStringLiteral(prop.value)) {
              inlinedStyle += `${camelToKebab(key)}:${prop.value.value};`;
            } else if (key && t.isNumericLiteral(prop.value)) {
              inlinedStyle += `${camelToKebab(key)}:${prop.value.value};`;
            } else if (
              key &&
              (t.isNullLiteral(prop.value) ||
                (t.isIdentifier(prop.value) && prop.value.name === "undefined"))
            ) {
              // skip null/undefined
            } else {
              remainingProps.push(prop as t.ObjectProperty);
            }
          } else {
            remainingProps.push(prop as t.ObjectProperty);
          }
        }

        if (inlinedStyle) {
          html += ` style="${escapeHtml(inlinedStyle.replace(/;$/, ""), true)}"`;
        }

        if (remainingProps.length > 0) {
          holes.push({
            walkPath: [],
            kind: "style",
            name: "style",
            expression: t.objectExpression(remainingProps),
          });
        }
        continue;
      }

      holes.push({ walkPath: [], kind: "style", name: "style", expression: value });
      continue;
    }

    if (attrName === "classList" && value) {
      holes.push({ walkPath: [], kind: "classList", name: "classList", expression: value });
      continue;
    }

    if (
      attrName.startsWith("on") &&
      attrName[2] !== undefined &&
      attrName[2] === attrName[2].toUpperCase()
    ) {
      if (value) {
        let eventName: string;
        if (REACT_INPUT_EVENTS[attrName] && isInputLikeTag(tagName)) {
          eventName = REACT_INPUT_EVENTS[attrName]!;
        } else if (REACT_EVENT_MAP[attrName]) {
          eventName = REACT_EVENT_MAP[attrName]!;
        } else {
          eventName = attrName.slice(2).toLowerCase();
        }
        holes.push({
          walkPath: [],
          kind: "event",
          name: eventName,
          expression: value,
          isDelegated: DELEGATED_EVENTS.has(eventName),
        });
      }
      continue;
    }

    if (attrName === "dangerouslySetInnerHTML" && value) {
      holes.push({
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
        html += ` ${resolvedName}="${escapeHtml(value.value, true)}"`;
      } else if (t.isBooleanLiteral(value) && value.value) {
        html += ` ${resolvedName}`;
      }
      continue;
    }

    if (value) {
      const isAttribute = isSVG || attrName.includes("-");
      const resolvedName = isAttribute ? PROPERTY_ALIASES[attrName] || attrName : attrName;
      holes.push({
        walkPath: [],
        kind: "attribute",
        name: resolvedName,
        expression: value,
        isAttribute,
      });
    }
  }

  html += ">";

  if (VOID_ELEMENTS.has(tagName)) {
    return { html, isSVG, holes, inserts };
  }

  const children = node.children;
  let childIndex = 0;

  for (const child of children) {
    if (t.isJSXText(child)) {
      const text = trimWhitespace((child.extra?.raw as string) ?? child.value);
      if (text.length) {
        html += escapeHtml(text);
        childIndex++;
      }
      continue;
    }

    if (t.isJSXExpressionContainer(child)) {
      if (t.isJSXEmptyExpression(child.expression)) continue;

      if (isStaticExpression(child.expression)) {
        if (t.isStringLiteral(child.expression)) {
          html += escapeHtml(child.expression.value);
        } else if (t.isNumericLiteral(child.expression)) {
          html += String(child.expression.value);
        }
        childIndex++;
        continue;
      }

      html += "\u200B";
      const walkPath = buildChildWalkPath(childIndex);
      inserts.push({
        walkPath,
        expression: wrapThunk(child.expression),
      });
      childIndex++;
      continue;
    }

    if (t.isJSXElement(child)) {
      const childTagName = getTagName(child);
      if (isComponent(childTagName)) {
        html += "<!>";
        const walkPath = buildChildWalkPath(childIndex);
        inserts.push({
          walkPath,
          expression: wrapThunk(buildComponentExpression(child, createElementCallee)),
        });
        childIndex++;
        continue;
      }

      const childResult = buildTemplateHtml(child, isSVG, createElementCallee);
      html += childResult.html;
      const childWalkBase = buildChildWalkPath(childIndex);

      for (const hole of childResult.holes) {
        holes.push({
          ...hole,
          walkPath: [...childWalkBase, ...hole.walkPath],
        });
      }
      for (const insert of childResult.inserts) {
        inserts.push({
          ...insert,
          walkPath: [...childWalkBase, ...insert.walkPath],
        });
      }
      childIndex++;
      continue;
    }

    if (t.isJSXFragment(child)) {
      for (const fragmentChild of child.children) {
        if (t.isJSXText(fragmentChild)) {
          const text = trimWhitespace((fragmentChild.extra?.raw as string) ?? fragmentChild.value);
          if (text.length) {
            html += escapeHtml(text);
            childIndex++;
          }
        } else if (t.isJSXExpressionContainer(fragmentChild)) {
          if (t.isJSXEmptyExpression(fragmentChild.expression)) continue;

          if (isStaticExpression(fragmentChild.expression)) {
            if (t.isStringLiteral(fragmentChild.expression)) {
              html += escapeHtml(fragmentChild.expression.value);
            } else if (t.isNumericLiteral(fragmentChild.expression)) {
              html += String(fragmentChild.expression.value);
            }
            childIndex++;
          } else {
            html += "\u200B";
            const walkPath = buildChildWalkPath(childIndex);
            inserts.push({
              walkPath,
              expression: wrapThunk(fragmentChild.expression),
            });
            childIndex++;
          }
        } else if (t.isJSXElement(fragmentChild)) {
          const fragChildTag = getTagName(fragmentChild);
          if (isComponent(fragChildTag)) {
            html += "<!>";
            const walkPath = buildChildWalkPath(childIndex);
            inserts.push({
              walkPath,
              expression: wrapThunk(buildComponentExpression(fragmentChild, createElementCallee)),
            });
            childIndex++;
          } else {
            const childResult = buildTemplateHtml(fragmentChild, isSVG, createElementCallee);
            html += childResult.html;
            const childWalkBase = buildChildWalkPath(childIndex);
            for (const hole of childResult.holes) {
              holes.push({
                ...hole,
                walkPath: [...childWalkBase, ...hole.walkPath],
              });
            }
            for (const insert of childResult.inserts) {
              inserts.push({
                ...insert,
                walkPath: [...childWalkBase, ...insert.walkPath],
              });
            }
            childIndex++;
          }
        }
      }
      continue;
    }

    if (t.isJSXSpreadChild(child)) {
      html += "\u200B";
      const walkPath = buildChildWalkPath(childIndex);
      inserts.push({
        walkPath,
        expression: wrapThunk(child.expression),
      });
      childIndex++;
      continue;
    }
  }

  html += `</${tagName}>`;
  return { html, isSVG, holes, inserts };
};

const isInputLikeTag = (tag: string): boolean => {
  return tag === "input" || tag === "textarea";
};

const buildChildWalkPath = (childIndex: number): TemplateWalkStep[] => {
  const steps: TemplateWalkStep[] = [{ method: "firstChild" }];
  for (let i = 0; i < childIndex; i++) {
    steps.push({ method: "nextSibling" });
  }
  return steps;
};

const buildComponentExpression = (
  node: t.JSXElement,
  createElementCallee?: () => t.Expression,
): t.Expression => {
  const tagName = getTagName(node);
  const parts = tagName.split(".");
  let callee: t.Expression;
  if (parts.length === 1) {
    callee = t.identifier(parts[0]!);
  } else {
    callee = parts.reduce<t.Expression>(
      (obj, prop) => t.memberExpression(obj, t.identifier(prop)),
      t.identifier(parts[0]!),
    );
  }

  const props: Array<t.ObjectProperty | t.SpreadElement> = [];
  const attributes = node.openingElement.attributes;

  for (const attr of attributes) {
    if (t.isJSXSpreadAttribute(attr)) {
      props.push(t.spreadElement(attr.argument));
      continue;
    }
    const attrName = getAttributeName(attr);
    if (attrName === "key") continue;
    const value = getAttributeValue(attr);
    if (value) {
      props.push(
        t.objectProperty(
          attrName.includes("-") ? t.stringLiteral(attrName) : t.identifier(attrName),
          value,
        ),
      );
    }
  }

  const children = node.children.filter((c) => !(t.isJSXText(c) && !c.value.trim()));
  if (children.length > 0) {
    const childExprs = children.map((child) => {
      if (t.isJSXText(child)) return t.stringLiteral(child.value.trim());
      if (t.isJSXExpressionContainer(child)) {
        return t.isJSXEmptyExpression(child.expression) ? t.nullLiteral() : child.expression;
      }
      if (t.isJSXElement(child)) return buildComponentExpression(child, createElementCallee);
      return t.nullLiteral();
    });
    if (childExprs.length === 1) {
      props.push(t.objectProperty(t.identifier("children"), childExprs[0]!));
    } else {
      props.push(t.objectProperty(t.identifier("children"), t.arrayExpression(childExprs)));
    }
  }

  const propsArg = props.length > 0 ? t.objectExpression(props) : t.nullLiteral();

  const elementCallee = createElementCallee
    ? createElementCallee()
    : t.memberExpression(t.identifier("React"), t.identifier("createElement"));

  return t.callExpression(elementCallee, [callee, propsArg]);
};
