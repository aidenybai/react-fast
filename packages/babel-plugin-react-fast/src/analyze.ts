import * as t from "@babel/types";
import { getTagName, isComponent } from "./shared/utils.js";

export interface OptimizationTarget {
  node: t.JSXElement;
  isRoot: boolean;
}

export interface AnalysisResult {
  targets: OptimizationTarget[];
  hasComponentChildren: boolean;
}

export interface MapAnalysis {
  dataSource: t.Expression;
  itemParam: t.Pattern;
  componentName: string;
  keyExpr: t.Expression;
  props: { name: string; value: t.Expression }[];
  selectorInfo: SelectorInfo | null;
}

export interface SelectorInfo {
  propName: string;
  selectorVar: t.Expression;
  keyExpr: t.Expression;
}

export const analyzeMapExpression = (
  expr: t.CallExpression,
): MapAnalysis | null => {
  if (!t.isMemberExpression(expr.callee)) return null;
  if (!t.isIdentifier(expr.callee.property) || expr.callee.property.name !== "map") return null;

  const dataSource = expr.callee.object;
  const callback = expr.arguments[0];
  if (!t.isArrowFunctionExpression(callback) && !t.isFunctionExpression(callback)) return null;

  const itemParam = callback.params[0];
  if (!itemParam) return null;

  const jsxElement = getReturnedJSX(callback);
  if (!jsxElement || !t.isJSXElement(jsxElement)) return null;

  const tag = getTagName(jsxElement);
  if (!isComponent(tag)) return null;

  const attrs = jsxElement.openingElement.attributes;
  let keyExpr: t.Expression | null = null;
  const props: { name: string; value: t.Expression }[] = [];

  for (const attr of attrs) {
    if (t.isJSXSpreadAttribute(attr)) return null;
    if (!t.isJSXAttribute(attr) || !t.isJSXIdentifier(attr.name)) continue;

    const name = attr.name.name;
    const value = extractAttrValue(attr);
    if (!value) continue;

    if (name === "key") {
      keyExpr = value;
    } else {
      props.push({ name, value });
    }
  }

  if (!keyExpr) return null;

  const selectorInfo = detectSelector(props, keyExpr, itemParam);

  return {
    dataSource,
    itemParam,
    componentName: tag,
    keyExpr,
    props,
    selectorInfo,
  };
};

const getReturnedJSX = (fn: t.ArrowFunctionExpression | t.FunctionExpression): t.Expression | null => {
  if (t.isExpression(fn.body)) {
    return t.isParenthesizedExpression(fn.body) ? fn.body.expression : fn.body;
  }
  if (t.isBlockStatement(fn.body)) {
    for (const stmt of fn.body.body) {
      if (t.isReturnStatement(stmt) && stmt.argument) return stmt.argument;
    }
  }
  return null;
};

const extractAttrValue = (attr: t.JSXAttribute): t.Expression | null => {
  if (!attr.value) return t.booleanLiteral(true);
  if (t.isStringLiteral(attr.value)) return attr.value;
  if (t.isJSXExpressionContainer(attr.value) && t.isExpression(attr.value.expression)) {
    return attr.value.expression;
  }
  return null;
};

const detectSelector = (
  props: { name: string; value: t.Expression }[],
  keyExpr: t.Expression,
  _itemParam: t.Pattern,
): SelectorInfo | null => {
  for (const prop of props) {
    if (!t.isBinaryExpression(prop.value, { operator: "===" })) continue;
    const { left, right } = prop.value;
    if (expressionsMatch(right, keyExpr) && isSimpleIdentifierOrMember(left)) {
      return { propName: prop.name, selectorVar: left, keyExpr: right };
    }
    if (expressionsMatch(left, keyExpr) && isSimpleIdentifierOrMember(right)) {
      return { propName: prop.name, selectorVar: right, keyExpr: left };
    }
  }
  return null;
};

const expressionsMatch = (nodeA: t.Expression | t.Node, nodeB: t.Expression | t.Node): boolean => {
  if (t.isIdentifier(nodeA) && t.isIdentifier(nodeB)) return nodeA.name === nodeB.name;
  if (t.isMemberExpression(nodeA) && t.isMemberExpression(nodeB)) {
    if (!expressionsMatch(nodeA.object, nodeB.object)) return false;
    if (t.isIdentifier(nodeA.property) && t.isIdentifier(nodeB.property)) return nodeA.property.name === nodeB.property.name;
    return false;
  }
  return false;
};

const isSimpleIdentifierOrMember = (expr: t.Expression): boolean => {
  if (t.isIdentifier(expr)) return true;
  if (t.isMemberExpression(expr) && !expr.computed && t.isIdentifier(expr.property)) {
    return isSimpleIdentifierOrMember(expr.object as t.Expression);
  }
  return false;
};

export const analyzeJSXTree = (node: t.JSXElement | t.JSXFragment): AnalysisResult => {
  if (t.isJSXFragment(node)) {
    return analyzeFragment(node);
  }
  return analyzeElement(node, true);
};

const analyzeFragment = (node: t.JSXFragment): AnalysisResult => {
  const targets: OptimizationTarget[] = [];
  let hasComponentChildren = false;

  for (const child of node.children) {
    if (t.isJSXElement(child)) {
      const tagName = getTagName(child);
      if (isComponent(tagName)) {
        hasComponentChildren = true;
      } else {
        const childAnalysis = analyzeElement(child, false);
        if (childAnalysis.hasComponentChildren) {
          hasComponentChildren = true;
          targets.push(...childAnalysis.targets);
        } else if (isWorthOptimizing(child)) {
          targets.push({ node: child, isRoot: false });
        }
      }
    }
  }

  return { targets, hasComponentChildren };
};

const analyzeElement = (node: t.JSXElement, isRoot: boolean): AnalysisResult => {
  const tagName = getTagName(node);

  if (isComponent(tagName)) {
    return { targets: [], hasComponentChildren: true };
  }

  if (hasChildrenProp(node)) {
    return { targets: [], hasComponentChildren: true };
  }

  if (containsComponent(node)) {
    const targets = findOptimizableSubtrees(node);
    return { targets, hasComponentChildren: true };
  }

  if (isWorthOptimizing(node)) {
    return { targets: [{ node, isRoot }], hasComponentChildren: false };
  }

  return { targets: [], hasComponentChildren: false };
};

const hasChildrenProp = (node: t.JSXElement): boolean => {
  for (const attr of node.openingElement.attributes) {
    if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name) && attr.name.name === "children") {
      return true;
    }
  }
  return false;
};

export const containsComponent = (node: t.JSXElement): boolean => {
  for (const child of node.children) {
    if (t.isJSXElement(child)) {
      const childTag = getTagName(child);
      if (isComponent(childTag)) return true;
      if (containsComponent(child)) return true;
    }
    if (t.isJSXFragment(child)) {
      for (const fragChild of child.children) {
        if (t.isJSXElement(fragChild)) {
          const fragChildTag = getTagName(fragChild);
          if (isComponent(fragChildTag)) return true;
          if (containsComponent(fragChild)) return true;
        }
      }
    }
    if (t.isJSXExpressionContainer(child) && !t.isJSXEmptyExpression(child.expression)) {
      if (expressionMayContainComponent(child.expression)) return true;
    }
  }
  return false;
};

const expressionMayContainComponent = (expr: t.Expression | t.JSXEmptyExpression): boolean => {
  if (t.isJSXElement(expr)) {
    const tag = getTagName(expr);
    if (isComponent(tag)) return true;
    return containsComponent(expr);
  }
  if (t.isJSXFragment(expr)) return true;
  if (t.isConditionalExpression(expr)) {
    return (
      expressionMayContainComponent(expr.consequent) ||
      expressionMayContainComponent(expr.alternate)
    );
  }
  if (t.isLogicalExpression(expr)) {
    return (
      expressionMayContainComponent(expr.left as t.Expression) ||
      expressionMayContainComponent(expr.right as t.Expression)
    );
  }
  if (t.isCallExpression(expr)) {
    if (t.isMemberExpression(expr.callee) && t.isIdentifier(expr.callee.property)) {
      if (expr.callee.property.name === "map" || expr.callee.property.name === "flatMap") {
        const callback = expr.arguments[0];
        if (t.isArrowFunctionExpression(callback) || t.isFunctionExpression(callback)) {
          const body = callback.body;
          if (t.isJSXElement(body) || t.isJSXFragment(body)) return true;
          if (t.isExpression(body)) return expressionMayContainComponent(body);
          if (t.isBlockStatement(body)) {
            for (const stmt of body.body) {
              if (t.isReturnStatement(stmt) && stmt.argument) {
                if (expressionMayContainComponent(stmt.argument as t.Expression)) return true;
              }
            }
          }
        }
      }
    }
  }
  if (t.isParenthesizedExpression(expr)) {
    return expressionMayContainComponent(expr.expression);
  }
  return false;
};

const findOptimizableSubtrees = (node: t.JSXElement): OptimizationTarget[] => {
  const targets: OptimizationTarget[] = [];

  for (const child of node.children) {
    if (t.isJSXElement(child)) {
      const childTag = getTagName(child);
      if (isComponent(childTag)) continue;

      if (containsComponent(child)) {
        targets.push(...findOptimizableSubtrees(child));
      } else if (isWorthOptimizing(child)) {
        targets.push({ node: child, isRoot: false });
      }
    }
  }

  return targets;
};

const isWorthOptimizing = (node: t.JSXElement): boolean => {
  let childNodeCount = 0;

  for (const child of node.children) {
    if (t.isJSXElement(child)) {
      childNodeCount++;
    }
    if (t.isJSXExpressionContainer(child) && !t.isJSXEmptyExpression(child.expression)) {
      if (expressionContainsJSX(child.expression)) return false;
      childNodeCount++;
    }
    if (t.isJSXText(child)) {
      const text = child.value.trim();
      if (text) childNodeCount++;
    }
  }

  return childNodeCount >= 1;
};

const expressionContainsJSX = (expr: t.Expression | t.Node): boolean => {
  if (t.isJSXElement(expr) || t.isJSXFragment(expr)) return true;
  if (t.isIdentifier(expr) && expr.name === "children") return true;
  if (
    t.isMemberExpression(expr) &&
    t.isIdentifier(expr.property) &&
    expr.property.name === "children"
  )
    return true;
  if (t.isConditionalExpression(expr)) {
    return expressionContainsJSX(expr.consequent) || expressionContainsJSX(expr.alternate);
  }
  if (t.isLogicalExpression(expr)) {
    return expressionContainsJSX(expr.left) || expressionContainsJSX(expr.right);
  }
  if (t.isSequenceExpression(expr)) {
    return expr.expressions.some((innerExpr) => expressionContainsJSX(innerExpr));
  }
  if (t.isCallExpression(expr)) {
    if (t.isMemberExpression(expr.callee) && t.isIdentifier(expr.callee.property)) {
      if (expr.callee.property.name === "map" || expr.callee.property.name === "flatMap") {
        const callback = expr.arguments[0];
        if (t.isArrowFunctionExpression(callback) || t.isFunctionExpression(callback)) {
          const body = callback.body;
          if (t.isJSXElement(body) || t.isJSXFragment(body)) return true;
          if (t.isBlockStatement(body)) {
            for (const stmt of body.body) {
              if (t.isReturnStatement(stmt) && stmt.argument) {
                if (expressionContainsJSX(stmt.argument)) return true;
              }
            }
          }
        }
      }
    }
  }
  if (t.isParenthesizedExpression(expr)) {
    return expressionContainsJSX(expr.expression);
  }
  return false;
};
