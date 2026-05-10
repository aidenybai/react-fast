import * as t from "@babel/types";
import {
  getTagName,
  isComponent,
  isStaticExpression,
  escapeHtml,
} from "./shared/utils.js";
import type { DynamicHole, TemplateWalkStep, ComponentInsert } from "./generate-template.js";

export interface ChildrenResult {
  html: string;
  holes: DynamicHole[];
  componentInserts: ComponentInsert[];
  childCount: number;
}

export const processChildren = (
  children: t.JSXElement["children"],
  isSVG: boolean,
): ChildrenResult => {
  let html = "";
  const holes: DynamicHole[] = [];
  const componentInserts: ComponentInsert[] = [];
  let childIndex = 0;

  for (const child of children) {
    if (t.isJSXText(child)) {
      const raw = child.value;
      const trimmed = collapseWhitespace(raw);
      if (trimmed) {
        html += escapeHtml(trimmed);
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

      html += " ";
      const walkPath = buildChildWalkPath(childIndex);
      holes.push({
        walkPath,
        kind: "text",
        expression: child.expression,
      });
      childIndex++;
      continue;
    }

    if (t.isJSXElement(child)) {
      const childTagName = getTagName(child);
      if (isComponent(childTagName)) {
        html += "<!>";
        const walkPath = buildChildWalkPath(childIndex);
        componentInserts.push({
          walkPath,
          expression: buildCreateElement(child),
        });
        childIndex++;
        continue;
      }
      childIndex++;
      continue;
    }

    if (t.isJSXFragment(child)) {
      for (const fragChild of child.children) {
        if (t.isJSXText(fragChild)) {
          const text = collapseWhitespace(fragChild.value);
          if (text) {
            html += escapeHtml(text);
            childIndex++;
          }
        } else if (t.isJSXExpressionContainer(fragChild)) {
          if (t.isJSXEmptyExpression(fragChild.expression)) continue;
          html += " ";
          const walkPath = buildChildWalkPath(childIndex);
          holes.push({
            walkPath,
            kind: "text",
            expression: fragChild.expression,
          });
          childIndex++;
        }
      }
      continue;
    }

    if (t.isJSXSpreadChild(child)) {
      html += " ";
      const walkPath = buildChildWalkPath(childIndex);
      holes.push({
        walkPath,
        kind: "text",
        expression: child.expression,
      });
      childIndex++;
    }
  }

  return { html, holes, componentInserts, childCount: childIndex };
};

const buildChildWalkPath = (childIndex: number): TemplateWalkStep[] => {
  const steps: TemplateWalkStep[] = [{ method: "firstChild" }];
  for (let i = 0; i < childIndex; i++) {
    steps.push({ method: "nextSibling" });
  }
  return steps;
};

const collapseWhitespace = (text: string): string => {
  return text.replace(/\n\s*/g, " ").replace(/\s+/g, " ");
};

const buildCreateElement = (node: t.JSXElement): t.Expression => {
  const tagName = getTagName(node);
  const parts = tagName.split(".");
  let callee: t.Expression;
  if (parts.length === 1) {
    callee = t.identifier(parts[0]!);
  } else {
    callee = parts.slice(1).reduce<t.Expression>(
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
    const name = t.isJSXIdentifier(attr.name) ? attr.name.name : `${attr.name.namespace.name}:${attr.name.name.name}`;
    if (name === "key") continue;
    let value: t.Expression;
    if (attr.value === null) {
      value = t.booleanLiteral(true);
    } else if (t.isStringLiteral(attr.value)) {
      value = attr.value;
    } else if (t.isJSXExpressionContainer(attr.value)) {
      if (t.isJSXEmptyExpression(attr.value.expression)) continue;
      value = attr.value.expression;
    } else {
      continue;
    }
    props.push(
      t.objectProperty(
        name.includes("-") ? t.stringLiteral(name) : t.identifier(name),
        value,
      ),
    );
  }

  const childExprs = buildChildExpressions(node.children);
  if (childExprs.length === 1) {
    props.push(t.objectProperty(t.identifier("children"), childExprs[0]!));
  } else if (childExprs.length > 1) {
    props.push(t.objectProperty(t.identifier("children"), t.arrayExpression(childExprs)));
  }

  const propsArg = props.length > 0 ? t.objectExpression(props) : t.nullLiteral();

  return t.callExpression(
    t.memberExpression(t.identifier("React"), t.identifier("createElement")),
    [callee, propsArg],
  );
};

const buildChildExpressions = (children: t.JSXElement["children"]): t.Expression[] => {
  const exprs: t.Expression[] = [];
  for (const child of children) {
    if (t.isJSXText(child)) {
      const text = collapseWhitespace(child.value);
      if (text.trim()) exprs.push(t.stringLiteral(text));
    } else if (t.isJSXExpressionContainer(child)) {
      if (!t.isJSXEmptyExpression(child.expression)) {
        exprs.push(child.expression);
      }
    } else if (t.isJSXElement(child)) {
      exprs.push(buildCreateElement(child));
    }
  }
  return exprs;
};
