import * as t from "@babel/types";
import type { NodePath } from "@babel/core";
import { buildTemplateHtml, registerTemplate } from "./generate-template.js";
import { buildResult } from "./build-result.js";
import { getTagName, isComponent, isSVGElement } from "./shared/utils.js";

interface PluginState {
  templates: Map<string, { id: t.Identifier; html: string; isSVG: boolean }>;
  templateCounter: number;
  elementCounter: number;
  delegatedEvents: Set<string>;
  runtimeImports: Set<string>;
}

export const transformJSXElement = (
  path: NodePath<t.JSXElement>,
  state: PluginState,
): t.Expression | null => {
  const tagName = getTagName(path.node);

  if (isComponent(tagName)) {
    return transformComponent(path.node);
  }

  if (isDynamicTag(path.node)) {
    return null;
  }

  return transformHTMLElement(path, state);
};

export const transformJSXFragment = (
  path: NodePath<t.JSXFragment>,
  state: PluginState,
): t.Expression | null => {
  const children = path.node.children.filter(
    (c) => !(t.isJSXText(c) && !c.value.trim()),
  );

  if (children.length === 0) return t.nullLiteral();
  if (children.length === 1) {
    const child = children[0]!;
    if (t.isJSXElement(child)) {
      const childPath = path.get("children").find(
        (p) => p.node === child,
      ) as NodePath<t.JSXElement> | undefined;
      if (childPath) return transformJSXElement(childPath, state);
    }
    if (t.isJSXExpressionContainer(child)) {
      if (t.isJSXEmptyExpression(child.expression)) return t.nullLiteral();
      return child.expression;
    }
    if (t.isJSXText(child)) {
      return t.stringLiteral(child.value.trim());
    }
  }

  const elements: t.Expression[] = [];
  for (const child of children) {
    if (t.isJSXText(child)) {
      const text = child.value.trim();
      if (text) elements.push(t.stringLiteral(text));
    } else if (t.isJSXExpressionContainer(child)) {
      if (!t.isJSXEmptyExpression(child.expression)) {
        elements.push(child.expression);
      }
    } else if (t.isJSXElement(child)) {
      const childTagName = getTagName(child);
      if (isComponent(childTagName)) {
        elements.push(transformComponent(child));
      } else {
        const childPath = path.get("children").find(
          (p) => p.node === child,
        ) as NodePath<t.JSXElement> | undefined;
        if (childPath) {
          const result = transformHTMLElement(childPath, state);
          if (result) elements.push(result);
        }
      }
    }
  }

  return t.arrayExpression(elements);
};

const transformHTMLElement = (
  path: NodePath<t.JSXElement>,
  state: PluginState,
): t.Expression => {
  const node = path.node;
  const tagName = getTagName(node);
  const isSVG = isSVGElement(tagName);

  const templateResult = buildTemplateHtml(node, isSVG);
  const templateInfo = registerTemplate(templateResult.html, templateResult.isSVG, state);

  state.runtimeImports.add("template");

  state.elementCounter++;
  const rootId = t.identifier(`_el$`);

  const { statements, delegatedEvents } = buildResult(
    templateInfo.id,
    rootId,
    templateResult.holes,
    templateResult.componentInserts,
    state.runtimeImports,
  );

  for (const event of delegatedEvents) {
    state.delegatedEvents.add(event);
  }

  const iife = t.callExpression(
    t.arrowFunctionExpression([], t.blockStatement(statements)),
    [],
  );

  return iife;
};

const transformComponent = (node: t.JSXElement): t.Expression => {
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
  for (const attr of node.openingElement.attributes) {
    if (t.isJSXSpreadAttribute(attr)) {
      props.push(t.spreadElement(attr.argument));
      continue;
    }
    const name = t.isJSXIdentifier(attr.name)
      ? attr.name.name
      : `${attr.name.namespace.name}:${attr.name.name.name}`;
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

  const childExprs = buildComponentChildren(node.children);
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

const buildComponentChildren = (children: t.JSXElement["children"]): t.Expression[] => {
  const exprs: t.Expression[] = [];
  for (const child of children) {
    if (t.isJSXText(child)) {
      const text = child.value.replace(/\n\s*/g, " ").replace(/\s+/g, " ").trim();
      if (text) exprs.push(t.stringLiteral(text));
    } else if (t.isJSXExpressionContainer(child)) {
      if (!t.isJSXEmptyExpression(child.expression)) {
        exprs.push(child.expression);
      }
    } else if (t.isJSXElement(child)) {
      exprs.push(transformComponent(child));
    }
  }
  return exprs;
};

const isDynamicTag = (node: t.JSXElement): boolean => {
  const name = node.openingElement.name;
  if (t.isJSXIdentifier(name)) {
    const first = name.name[0];
    return first !== undefined && first === first.toLowerCase() && /[^a-z]/.test(name.name);
  }
  return false;
};
