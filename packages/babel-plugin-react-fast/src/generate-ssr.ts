import * as t from "@babel/types";
import {
  VOID_ELEMENTS,
  PROPERTY_ALIASES,
  REACT_EVENT_MAP,
  REACT_INPUT_EVENTS,
} from "./shared/constants.js";
import {
  getTagName,
  isComponent,
  getAttributeName,
  getAttributeValue,
  isStaticExpression,
  escapeHtml,
  isSVGElement,
  trimWhitespace,
  camelToKebab,
} from "./shared/utils.js";
import type { ImportResolver } from "./shared/types.js";

export const buildSSRHtml = (
  node: t.JSXElement,
  getImportId: ImportResolver,
  parentSVG = false,
): t.Expression => {
  const tagName = getTagName(node);
  const isSVG = parentSVG || isSVGElement(tagName);

  const parts: SSRPart[] = [];
  buildSSRParts(node, parts, getImportId, isSVG);

  return partsToTemplateLiteral(parts, getImportId);
};

export const buildSSRChildrenHtml = (
  node: t.JSXElement,
  getImportId: ImportResolver,
  parentSVG = false,
): t.Expression => {
  const tagName = getTagName(node);
  const isSVG = parentSVG || isSVGElement(tagName);

  const parts: SSRPart[] = [];
  buildChildrenSSRParts(node.children, parts, getImportId, isSVG);

  return partsToTemplateLiteral(parts, getImportId);
};

export const buildClientChildrenHtml = (
  node: t.JSXElement,
  parentSVG = false,
): t.Expression => {
  const tagName = getTagName(node);
  const isSVG = parentSVG || isSVGElement(tagName);

  const parts: SSRPart[] = [];
  buildChildrenClientParts(node.children, parts, isSVG);

  return partsToTemplateLiteral(parts, (() => t.identifier("_")) as ImportResolver);
};

const buildChildrenClientParts = (
  children: t.JSXElement["children"],
  parts: SSRPart[],
  isSVG: boolean,
): void => {
  for (const child of children) {
    if (t.isJSXText(child)) {
      const text = trimWhitespace((child.extra?.raw as string) ?? child.value);
      if (text.length) {
        parts.push({ kind: "static", value: escapeHtml(text) });
      }
      continue;
    }

    if (t.isJSXExpressionContainer(child)) {
      if (t.isJSXEmptyExpression(child.expression)) continue;

      if (isStaticExpression(child.expression)) {
        if (t.isStringLiteral(child.expression)) {
          parts.push({ kind: "static", value: escapeHtml(child.expression.value) });
        } else if (t.isNumericLiteral(child.expression)) {
          parts.push({ kind: "static", value: String(child.expression.value) });
        }
        continue;
      }

      // Client-side: no escape() wrapper, just raw interpolation
      parts.push({ kind: "dynamic", expression: child.expression });
      continue;
    }

    if (t.isJSXElement(child)) {
      const childTagName = getTagName(child);
      if (isComponent(childTagName)) {
        continue;
      }
      buildClientElementParts(child, parts, isSVG);
      continue;
    }

    if (t.isJSXFragment(child)) {
      for (const fragChild of child.children) {
        if (t.isJSXText(fragChild)) {
          const text = trimWhitespace((fragChild.extra?.raw as string) ?? fragChild.value);
          if (text.length) {
            parts.push({ kind: "static", value: escapeHtml(text) });
          }
        } else if (t.isJSXExpressionContainer(fragChild)) {
          if (!t.isJSXEmptyExpression(fragChild.expression)) {
            if (isStaticExpression(fragChild.expression)) {
              if (t.isStringLiteral(fragChild.expression)) {
                parts.push({ kind: "static", value: escapeHtml(fragChild.expression.value) });
              } else if (t.isNumericLiteral(fragChild.expression)) {
                parts.push({ kind: "static", value: String(fragChild.expression.value) });
              }
            } else {
              parts.push({ kind: "dynamic", expression: fragChild.expression });
            }
          }
        } else if (t.isJSXElement(fragChild)) {
          buildClientElementParts(fragChild, parts, isSVG);
        }
      }
      continue;
    }

    if (t.isJSXSpreadChild(child)) {
      parts.push({ kind: "dynamic", expression: child.expression });
      continue;
    }
  }
};

const buildClientElementParts = (
  node: t.JSXElement,
  parts: SSRPart[],
  parentSVG: boolean,
): void => {
  const tagName = getTagName(node);
  const isSVG = parentSVG || isSVGElement(tagName);

  parts.push({ kind: "static", value: `<${tagName}` });

  for (const attr of node.openingElement.attributes) {
    if (t.isJSXSpreadAttribute(attr)) continue;
    const attrName = getAttributeName(attr);
    const value = getAttributeValue(attr);
    if (attrName === "ref" || attrName === "key" || attrName === "children") continue;
    if (attrName.startsWith("on") && attrName[2] && attrName[2] === attrName[2].toUpperCase()) continue;
    if (attrName === "dangerouslySetInnerHTML" || attrName === "classList") continue;

    const resolvedName = PROPERTY_ALIASES[attrName] || attrName;

    if (value && isStaticExpression(value)) {
      if (t.isStringLiteral(value)) {
        parts.push({ kind: "static", value: ` ${resolvedName}="${escapeHtml(value.value, true)}"` });
      } else if (t.isBooleanLiteral(value) && value.value) {
        parts.push({ kind: "static", value: ` ${resolvedName}` });
      }
    } else if (value) {
      // Dynamic attribute: interpolate into template literal
      parts.push({ kind: "static", value: ` ${resolvedName}="` });
      parts.push({ kind: "dynamic", expression: value });
      parts.push({ kind: "static", value: `"` });
    }
  }

  parts.push({ kind: "static", value: ">" });
  if (VOID_ELEMENTS.has(tagName)) return;
  buildChildrenClientParts(node.children, parts, isSVG);
  parts.push({ kind: "static", value: `</${tagName}>` });
};

type SSRPart = { kind: "static"; value: string } | { kind: "dynamic"; expression: t.Expression };

const buildSSRParts = (
  node: t.JSXElement,
  parts: SSRPart[],
  getImportId: ImportResolver,
  parentSVG: boolean,
): void => {
  const tagName = getTagName(node);
  const isSVG = parentSVG || isSVGElement(tagName);

  parts.push({ kind: "static", value: `<${tagName}` });

  const attributes = node.openingElement.attributes;
  for (const attr of attributes) {
    if (t.isJSXSpreadAttribute(attr)) {
      continue;
    }

    const attrName = getAttributeName(attr);
    const value = getAttributeValue(attr);

    if (attrName === "ref" || attrName === "key" || attrName === "children") continue;

    if (attrName.startsWith("on") && attrName[2] && attrName[2] === attrName[2].toUpperCase()) {
      continue;
    }

    if (attrName === "dangerouslySetInnerHTML") continue;
    if (attrName === "classList") continue;

    if (attrName === "style" && value) {
      if (t.isStringLiteral(value)) {
        parts.push({ kind: "static", value: ` style="${escapeHtml(value.value, true)}"` });
        continue;
      }
      if (t.isObjectExpression(value)) {
        let inlined = "";
        for (const prop of value.properties) {
          if (t.isObjectProperty(prop) && !prop.computed) {
            const key = t.isIdentifier(prop.key)
              ? prop.key.name
              : t.isStringLiteral(prop.key)
                ? prop.key.value
                : null;
            if (key && t.isStringLiteral(prop.value)) {
              inlined += `${camelToKebab(key)}:${prop.value.value};`;
            } else if (key && t.isNumericLiteral(prop.value)) {
              inlined += `${camelToKebab(key)}:${prop.value.value};`;
            }
          }
        }
        if (inlined) {
          parts.push({
            kind: "static",
            value: ` style="${escapeHtml(inlined.replace(/;$/, ""), true)}"`,
          });
        }
        continue;
      }
      continue;
    }

    if (value && isStaticExpression(value)) {
      const resolvedName = PROPERTY_ALIASES[attrName] || attrName;
      if (t.isStringLiteral(value)) {
        parts.push({
          kind: "static",
          value: ` ${resolvedName}="${escapeHtml(value.value, true)}"`,
        });
      } else if (t.isBooleanLiteral(value) && value.value) {
        parts.push({ kind: "static", value: ` ${resolvedName}` });
      }
      continue;
    }

    if (value) {
      const resolvedName = PROPERTY_ALIASES[attrName] || attrName;
      parts.push({ kind: "static", value: ` ${resolvedName}="` });
      parts.push({
        kind: "dynamic",
        expression: t.callExpression(getImportId("escape"), [
          toStringExpr(value),
          t.booleanLiteral(true),
        ]),
      });
      parts.push({ kind: "static", value: `"` });
    }
  }

  parts.push({ kind: "static", value: ">" });

  if (VOID_ELEMENTS.has(tagName)) return;

  buildChildrenSSRParts(node.children, parts, getImportId, isSVG);

  parts.push({ kind: "static", value: `</${tagName}>` });
};

const buildChildrenSSRParts = (
  children: t.JSXElement["children"],
  parts: SSRPart[],
  getImportId: ImportResolver,
  isSVG: boolean,
): void => {
  for (const child of children) {
    if (t.isJSXText(child)) {
      const text = trimWhitespace((child.extra?.raw as string) ?? child.value);
      if (text.length) {
        parts.push({ kind: "static", value: escapeHtml(text) });
      }
      continue;
    }

    if (t.isJSXExpressionContainer(child)) {
      if (t.isJSXEmptyExpression(child.expression)) continue;

      if (isStaticExpression(child.expression)) {
        if (t.isStringLiteral(child.expression)) {
          parts.push({ kind: "static", value: escapeHtml(child.expression.value) });
        } else if (t.isNumericLiteral(child.expression)) {
          parts.push({ kind: "static", value: String(child.expression.value) });
        }
        continue;
      }

      parts.push({
        kind: "dynamic",
        expression: t.callExpression(getImportId("escape"), [toStringExpr(child.expression)]),
      });
      continue;
    }

    if (t.isJSXElement(child)) {
      const childTagName = getTagName(child);
      if (isComponent(childTagName)) {
        continue;
      }
      buildSSRParts(child, parts, getImportId, isSVG);
      continue;
    }

    if (t.isJSXFragment(child)) {
      for (const fragChild of child.children) {
        if (t.isJSXText(fragChild)) {
          const text = trimWhitespace((fragChild.extra?.raw as string) ?? fragChild.value);
          if (text.length) {
            parts.push({ kind: "static", value: escapeHtml(text) });
          }
        } else if (t.isJSXExpressionContainer(fragChild)) {
          if (!t.isJSXEmptyExpression(fragChild.expression)) {
            if (isStaticExpression(fragChild.expression)) {
              if (t.isStringLiteral(fragChild.expression)) {
                parts.push({ kind: "static", value: escapeHtml(fragChild.expression.value) });
              } else if (t.isNumericLiteral(fragChild.expression)) {
                parts.push({ kind: "static", value: String(fragChild.expression.value) });
              }
            } else {
              parts.push({
                kind: "dynamic",
                expression: t.callExpression(getImportId("escape"), [
                  toStringExpr(fragChild.expression),
                ]),
              });
            }
          }
        } else if (t.isJSXElement(fragChild)) {
          buildSSRParts(fragChild, parts, getImportId, isSVG);
        }
      }
      continue;
    }

    if (t.isJSXSpreadChild(child)) {
      parts.push({
        kind: "dynamic",
        expression: t.callExpression(getImportId("escape"), [toStringExpr(child.expression)]),
      });
      continue;
    }
  }
};

const partsToTemplateLiteral = (parts: SSRPart[], _getImportId: ImportResolver): t.Expression => {
  const quasis: t.TemplateElement[] = [];
  const expressions: t.Expression[] = [];

  let currentStatic = "";

  for (const part of parts) {
    if (part.kind === "static") {
      currentStatic += part.value;
    } else {
      quasis.push(t.templateElement({ raw: currentStatic, cooked: currentStatic }, false));
      expressions.push(part.expression);
      currentStatic = "";
    }
  }

  quasis.push(t.templateElement({ raw: currentStatic, cooked: currentStatic }, true));
  return t.templateLiteral(quasis, expressions);
};

const toStringExpr = (expr: t.Expression): t.Expression => {
  if (t.isStringLiteral(expr)) return expr;
  if (t.isNumericLiteral(expr)) return t.stringLiteral(String(expr.value));
  if (t.isTemplateLiteral(expr)) return expr;
  return expr;
};
