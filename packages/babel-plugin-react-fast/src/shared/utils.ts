import * as t from "@babel/types";
import { SVG_ELEMENTS } from "./constants.js";

export const isComponent = (tagName: string): boolean => {
  return (
    (tagName[0] !== undefined && tagName[0] !== tagName[0].toLowerCase()) ||
    tagName.includes(".") ||
    /[^a-zA-Z]/.test(tagName[0] || "")
  );
};

export const getTagName = (node: t.JSXElement): string => {
  const nameNode = node.openingElement.name;
  if (t.isJSXIdentifier(nameNode)) return nameNode.name;
  if (t.isJSXMemberExpression(nameNode)) return flattenMemberExpression(nameNode);
  if (t.isJSXNamespacedName(nameNode)) return `${nameNode.namespace.name}:${nameNode.name.name}`;
  return "";
};

const flattenMemberExpression = (node: t.JSXMemberExpression): string => {
  if (t.isJSXIdentifier(node.object)) {
    return `${node.object.name}.${node.property.name}`;
  }
  return `${flattenMemberExpression(node.object as t.JSXMemberExpression)}.${node.property.name}`;
};

export const isSVGElement = (tagName: string): boolean => {
  return SVG_ELEMENTS.has(tagName);
};

export const isStaticExpression = (node: t.Expression | t.JSXEmptyExpression): boolean => {
  if (t.isStringLiteral(node) || t.isNumericLiteral(node) || t.isBooleanLiteral(node)) {
    return true;
  }
  if (t.isTemplateLiteral(node) && node.expressions.length === 0) {
    return true;
  }
  return false;
};

export const isDynamic = (
  node: t.Expression | t.JSXEmptyExpression,
  checkMember = true,
): boolean => {
  if (t.isJSXEmptyExpression(node)) return false;
  if (isStaticExpression(node)) return false;
  if (t.isIdentifier(node)) return true;
  if (t.isCallExpression(node)) return true;
  if (t.isMemberExpression(node) && checkMember) return true;
  if (t.isOptionalMemberExpression(node)) return true;
  if (t.isConditionalExpression(node)) return true;
  if (t.isLogicalExpression(node)) return true;
  if (t.isBinaryExpression(node)) return true;
  if (t.isUnaryExpression(node)) return true;
  if (t.isTemplateLiteral(node) && node.expressions.length > 0) return true;
  if (t.isTaggedTemplateExpression(node)) return true;
  if (t.isObjectExpression(node)) return true;
  if (t.isArrayExpression(node)) return true;
  return false;
};

export const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
};

export const getAttributeName = (node: t.JSXAttribute): string => {
  if (t.isJSXIdentifier(node.name)) return node.name.name;
  return `${node.name.namespace.name}:${node.name.name.name}`;
};

export const getAttributeValue = (
  node: t.JSXAttribute,
): t.Expression | null => {
  if (node.value === null) return t.booleanLiteral(true);
  if (t.isStringLiteral(node.value)) return node.value;
  if (t.isJSXExpressionContainer(node.value)) {
    if (t.isJSXEmptyExpression(node.value.expression)) return null;
    return node.value.expression;
  }
  return null;
};
