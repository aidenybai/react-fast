import * as t from "@babel/types";
import type { NodePath } from "@babel/core";
import { addNamed } from "@babel/helper-module-imports";
import { SVG_ELEMENTS, MODULE_NAME } from "./constants.js";

export const registerImportMethod = (
  path: NodePath,
  name: string,
  moduleName: string = MODULE_NAME,
): t.Identifier => {
  const programScope = path.scope.getProgramParent();
  if (!programScope.data.imports) {
    programScope.data.imports = new Map<string, t.Identifier>();
  }
  const imports = programScope.data.imports as Map<string, t.Identifier>;
  const key = `${moduleName}:${name}`;
  if (!imports.has(key)) {
    const id = addNamed(path, name, moduleName, { nameHint: `_$${name}` });
    imports.set(key, id);
    return id;
  }
  return t.cloneNode(imports.get(key)!);
};

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
  if (t.isNullLiteral(node)) return true;
  if (t.isIdentifier(node) && node.name === "undefined") return true;
  if (t.isTemplateLiteral(node) && node.expressions.length === 0) {
    return true;
  }
  return false;
};

export const isDynamic = (
  path: NodePath,
  opts: { checkMember?: boolean; checkTags?: boolean; checkCallExpressions?: boolean } = {},
): boolean => {
  const { checkMember = true, checkTags = false, checkCallExpressions = true } = opts;
  const expr = path.node;

  if (t.isFunction(expr)) return false;

  if (
    checkCallExpressions &&
    (t.isCallExpression(expr) ||
      t.isOptionalCallExpression(expr) ||
      t.isTaggedTemplateExpression(expr))
  ) {
    return true;
  }

  if (checkMember && t.isMemberExpression(expr)) {
    const object = (path as NodePath<t.MemberExpression>).get("object");
    if (t.isIdentifier(object.node)) {
      const binding = path.scope.getBinding(object.node.name);
      if (binding && binding.path.isImportNamespaceSpecifier()) return false;
    }
    return true;
  }

  if (
    checkMember &&
    (t.isOptionalMemberExpression(expr) ||
      t.isSpreadElement(expr) ||
      (t.isBinaryExpression(expr) && expr.operator === "in"))
  ) {
    return true;
  }

  if (
    checkTags &&
    (t.isJSXElement(expr) || (t.isJSXFragment(expr) && (expr as t.JSXFragment).children.length))
  ) {
    return true;
  }

  let dynamic = false;
  path.traverse({
    Function(p) {
      p.skip();
    },
    CallExpression(p) {
      if (checkCallExpressions) {
        dynamic = true;
        p.stop();
      }
    },
    OptionalCallExpression(p) {
      if (checkCallExpressions) {
        dynamic = true;
        p.stop();
      }
    },
    MemberExpression(p) {
      if (checkMember) {
        dynamic = true;
        p.stop();
      }
    },
    OptionalMemberExpression(p) {
      if (checkMember) {
        dynamic = true;
        p.stop();
      }
    },
    SpreadElement(p) {
      if (checkMember) {
        dynamic = true;
        p.stop();
      }
    },
    BinaryExpression(p) {
      if (checkMember && p.node.operator === "in") {
        dynamic = true;
        p.stop();
      }
    },
    JSXElement(p) {
      if (checkTags) {
        dynamic = true;
        p.stop();
      } else p.skip();
    },
    JSXFragment(p) {
      if (checkTags && p.node.children.length) {
        dynamic = true;
        p.stop();
      } else p.skip();
    },
  });
  return dynamic;
};

export const trimWhitespace = (text: string): string => {
  text = text.replace(/\r/g, "");
  if (/\n/g.test(text)) {
    text = text
      .split("\n")
      .map((line, i) => (i ? line.replace(/^\s*/g, "") : line))
      .filter((line) => !/^\s*$/.test(line))
      .join(" ");
  }
  return text.replace(/\s+/g, " ");
};

export const escapeHtml = (input: string, isAttribute = false): string => {
  const delimiter = isAttribute ? '"' : "<";
  const escapedDelimiter = isAttribute ? "&quot;" : "&lt;";
  let delimiterIndex = input.indexOf(delimiter);
  let ampersandIndex = input.indexOf("&");

  if (delimiterIndex < 0 && ampersandIndex < 0) return input;

  let left = 0;
  let output = "";

  while (delimiterIndex >= 0 && ampersandIndex >= 0) {
    if (delimiterIndex < ampersandIndex) {
      if (left < delimiterIndex) output += input.substring(left, delimiterIndex);
      output += escapedDelimiter;
      left = delimiterIndex + 1;
      delimiterIndex = input.indexOf(delimiter, left);
    } else {
      if (left < ampersandIndex) output += input.substring(left, ampersandIndex);
      output += "&amp;";
      left = ampersandIndex + 1;
      ampersandIndex = input.indexOf("&", left);
    }
  }

  if (delimiterIndex >= 0) {
    do {
      if (left < delimiterIndex) output += input.substring(left, delimiterIndex);
      output += escapedDelimiter;
      left = delimiterIndex + 1;
      delimiterIndex = input.indexOf(delimiter, left);
    } while (delimiterIndex >= 0);
  } else {
    while (ampersandIndex >= 0) {
      if (left < ampersandIndex) output += input.substring(left, ampersandIndex);
      output += "&amp;";
      left = ampersandIndex + 1;
      ampersandIndex = input.indexOf("&", left);
    }
  }

  return left < input.length ? output + input.substring(left) : output;
};

const ID_CHARS = "etaoinshrdlucwmfygpbTAOISWCBvkxjqzPHFMDRELNGUKVYJQZX_$";
const ID_BASE = ID_CHARS.length;

export const getNumberedId = (num: number): string => {
  let out = "";
  do {
    const digit = num % ID_BASE;
    num = Math.floor(num / ID_BASE);
    out = ID_CHARS[digit]! + out;
  } while (num !== 0);
  return out;
};

export const wrapThunk = (expr: t.Expression): t.Expression => {
  if (t.isFunction(expr)) return expr;
  if (
    t.isCallExpression(expr) &&
    expr.arguments.length === 0 &&
    !t.isCallExpression(expr.callee) &&
    !t.isMemberExpression(expr.callee)
  ) {
    return expr.callee as t.Expression;
  }
  return t.arrowFunctionExpression([], expr);
};

export const getAttributeName = (node: t.JSXAttribute): string => {
  if (t.isJSXIdentifier(node.name)) return node.name.name;
  return `${node.name.namespace.name}:${node.name.name.name}`;
};

export const getAttributeValue = (node: t.JSXAttribute): t.Expression | null => {
  if (node.value === null) return t.booleanLiteral(true);
  if (t.isStringLiteral(node.value)) return node.value;
  if (t.isJSXExpressionContainer(node.value)) {
    if (t.isJSXEmptyExpression(node.value.expression)) return null;
    return node.value.expression;
  }
  return null;
};

export const camelToKebab = (input: string): string => {
  return input.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
};
