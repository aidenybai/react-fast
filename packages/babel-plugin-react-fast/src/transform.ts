import * as t from "@babel/types";
import type { NodePath } from "@babel/core";
import { buildTemplateHtml, registerTemplate } from "./generate-template.js";
import { generateHooks } from "./generate-hooks.js";
import { generateDomProtocol } from "./generate-dom.js";
import { generateListCode } from "./generate-list.js";
import { buildSSRHtml } from "./generate-ssr.js";
import { analyzeJSXTree, analyzeMapExpression, containsComponent } from "./analyze.js";
import type { PluginState, ImportResolver } from "./shared/types.js";
import { getTagName, isComponent, isSVGElement, registerImportMethod } from "./shared/utils.js";
import { VOID_ELEMENTS } from "./shared/constants.js";

export const transformJSXElement = (
  path: NodePath<t.JSXElement>,
  state: PluginState,
): t.Expression | null => {
  const tagName = getTagName(path.node);

  if (isComponent(tagName)) {
    return transformComponent(path.node, path);
  }

  if (isDynamicTag(path.node)) {
    return null;
  }

  if (VOID_ELEMENTS.has(tagName)) {
    return null;
  }

  if (!hasFunctionParent(path)) {
    return null;
  }

  const listResult = tryTransformListOptimization(path, state);
  if (listResult) return listResult;

  const analysis = analyzeJSXTree(path.node);

  if (analysis.hasComponentChildren) {
    return transformPartialOptimization(path, state, analysis.targets);
  }

  if (analysis.targets.length === 0) {
    return null;
  }

  return transformFullOptimization(path, state);
};

export const transformJSXFragment = (
  path: NodePath<t.JSXFragment>,
  state: PluginState,
): t.Expression | null => {
  if (!hasFunctionParent(path)) {
    return null;
  }

  const children = path.node.children.filter((childNode) => !(t.isJSXText(childNode) && !childNode.value.trim()));

  if (children.length === 0) return t.nullLiteral();
  if (children.length === 1) {
    const child = children[0]!;
    if (t.isJSXElement(child)) {
      const childPath = path.get("children").find((innerPath) => innerPath.node === child) as
        | NodePath<t.JSXElement>
        | undefined;
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

  const analysis = analyzeJSXTree(path.node);

  if (analysis.targets.length > 0 && !analysis.hasComponentChildren) {
    return transformFragmentOptimization(path, state);
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
        elements.push(transformComponent(child, path));
      } else {
        const childPath = path.get("children").find((innerPath) => innerPath.node === child) as
          | NodePath<t.JSXElement>
          | undefined;
        if (childPath) {
          const result = transformJSXElement(childPath, state);
          if (result) elements.push(result);
        }
      }
    }
  }

  return t.arrayExpression(elements);
};

const hasFunctionParent = (path: NodePath): boolean => {
  const funcParent = path.getFunctionParent();
  if (!funcParent) return false;
  return isComponentFunction(funcParent);
};

const isComponentFunction = (funcPath: NodePath): boolean => {
  const node = funcPath.node;

  if (t.isFunctionDeclaration(node) && node.id) {
    return /^[A-Z]/.test(node.id.name);
  }

  if (t.isFunctionExpression(node) || t.isArrowFunctionExpression(node)) {
    const parent = funcPath.parentPath;
    if (parent?.isVariableDeclarator()) {
      const id = parent.node.id;
      if (t.isIdentifier(id)) {
        return /^[A-Z]/.test(id.name);
      }
    }
    if (parent?.isAssignmentExpression()) {
      const left = parent.node.left;
      if (t.isIdentifier(left)) {
        return /^[A-Z]/.test(left.name);
      }
    }
    if (parent?.isCallExpression()) {
      const callee = parent.node.callee;
      if (t.isIdentifier(callee)) {
        const name = callee.name;
        if (name === "memo" || name === "forwardRef" || name === "lazy") return true;
      }
      if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
        const name = callee.property.name;
        if (name === "memo" || name === "forwardRef" || name === "lazy") return true;
      }
    }
  }

  return false;
};

const transformFullOptimization = (
  path: NodePath<t.JSXElement>,
  state: PluginState,
): t.Expression => {
  evaluateAttributes(path);
  const node = path.node;
  const tagName = getTagName(node);
  const isSVG = isSVGElement(tagName);

  const getImportId: ImportResolver = (name) => {
    if (name === "useMemo" || name === "useRef" || name === "useLayoutEffect" || name === "createElement") {
      return registerImportMethod(path, name, "react");
    }
    return registerImportMethod(path, name);
  };

  const childrenHtml = buildChildrenTemplateHtml(node, isSVG);
  const templateInfo = registerTemplate(childrenHtml.html, childrenHtml.isSVG, state, true);

  const instanceIndex = ++state.templateCounter;
  const hooks = generateHooks(
    templateInfo.id,
    childrenHtml.holes,
    childrenHtml.inserts,
    getImportId,
    instanceIndex,
  );

  for (const event of hooks.delegatedEvents) {
    state.delegatedEvents.add(event);
  }

  if (hooks.hoistedDeclarations.length > 0) {
    const programPath = path.findParent((ancestor) => ancestor.isProgram());
    if (programPath) {
      for (const declaration of hooks.hoistedDeclarations) {
        (programPath as NodePath<t.Program>).pushContainer("body", declaration);
      }
    }
  }

  injectHooksIntoFunction(path, hooks.statements);

  const fullTemplateInfo = registerTemplate(childrenHtml.fullHtml, childrenHtml.isSVG, state, false);

  emitDomProtocol(path, state, tagName, templateInfo.id, childrenHtml.holes, childrenHtml.inserts, instanceIndex, fullTemplateInfo.id);

  const createElementId = getImportId("createElement");

  const clientReturn = t.callExpression(createElementId, [
    t.stringLiteral(tagName),
    t.objectExpression([
      t.objectProperty(t.identifier("ref"), t.memberExpression(hooks.cacheId, t.identifier("ref"))),
    ]),
  ]);

  const cachedClient = t.logicalExpression(
    "||",
    t.memberExpression(hooks.cacheId, t.identifier("node")),
    t.assignmentExpression(
      "=",
      t.memberExpression(hooks.cacheId, t.identifier("node")),
      clientReturn,
    ),
  );

  if (!state.ssr) {
    return cachedClient;
  }

  const rootProps = buildRootProps(node);
  const ssrHtml = buildSSRHtml(node, getImportId, isSVG);
  const ssrFlagId = registerSSRFlag(state, path);

  const serverReturn = t.callExpression(createElementId, [
    t.stringLiteral(tagName),
    t.objectExpression([
      ...rootProps,
      t.objectProperty(
        t.identifier("dangerouslySetInnerHTML"),
        t.objectExpression([t.objectProperty(t.identifier("__html"), ssrHtml)]),
      ),
    ]),
  ]);

  return t.conditionalExpression(ssrFlagId, serverReturn, cachedClient);
};

const emitDomProtocol = (
  path: NodePath<t.JSXElement>,
  state: PluginState,
  tagName: string,
  templateId: t.Identifier,
  holes: import("./generate-template.js").DynamicHole[],
  inserts: import("./generate-template.js").InsertHole[],
  instanceIndex: number,
  fullTemplateId?: t.Identifier,
): void => {
  const funcPath = path.getFunctionParent();
  if (!funcPath) return;

  const params = funcPath.node.params;
  if (params.length === 0) return;

  let bindingName: string | null = null;
  let insertionTarget: NodePath | null = null;

  if (funcPath.isFunctionDeclaration() && funcPath.node.id) {
    bindingName = funcPath.node.id.name;
    insertionTarget = funcPath;
  } else {
    let current: NodePath | null = funcPath;
    while (current) {
      if (current.isVariableDeclarator()) {
        if (t.isIdentifier(current.node.id)) {
          bindingName = current.node.id.name;
          insertionTarget = current.parentPath;
        }
        break;
      }
      if (current.isCallExpression()) {
        current = current.parentPath;
        continue;
      }
      current = current.parentPath;
    }
  }

  if (!bindingName || !insertionTarget) return;

  const dom = generateDomProtocol(
    tagName,
    templateId,
    holes,
    inserts,
    params as t.Pattern[],
    instanceIndex,
    fullTemplateId,
  );

  for (const event of dom.delegatedEvents) {
    state.delegatedEvents.add(event);
  }

  const programPath = path.findParent((ancestor) => ancestor.isProgram());
  if (programPath && dom.hoistedDeclarations.length > 0) {
    for (const declaration of dom.hoistedDeclarations) {
      (programPath as NodePath<t.Program>).pushContainer("body", declaration);
    }
  }

  if (!state.pendingDomProtocols) state.pendingDomProtocols = [];
  state.pendingDomProtocols.push({
    bindingName,
    createFn: dom.createFn,
    patchFn: dom.patchFn,
  });
};

const tryTransformListOptimization = (
  path: NodePath<t.JSXElement>,
  state: PluginState,
): t.Expression | null => {
  const node = path.node;
  const tagName = getTagName(node);
  if (isComponent(tagName)) return null;

  const meaningfulChildren = node.children.filter(
    (childNode) => !(t.isJSXText(childNode) && !childNode.value.trim()),
  );
  if (meaningfulChildren.length !== 1) return null;

  const child = meaningfulChildren[0];
  if (!t.isJSXExpressionContainer(child) || t.isJSXEmptyExpression(child.expression)) return null;

  const expr = child.expression;
  if (!t.isCallExpression(expr)) return null;

  const mapAnalysis = analyzeMapExpression(expr);
  if (!mapAnalysis) return null;

  const getImportId: ImportResolver = (name) => {
    if (name === "useRef" || name === "createElement") {
      return registerImportMethod(path, name, "react");
    }
    return registerImportMethod(path, name);
  };

  const instanceIndex = ++state.templateCounter;
  const listCode = generateListCode(mapAnalysis, getImportId, instanceIndex);

  const patchStatements = t.isBlockStatement(listCode.patchBlock)
    ? listCode.patchBlock.body
    : [listCode.patchBlock];
  injectHooksIntoFunction(path, [...listCode.cacheStatements, ...patchStatements]);

  const createElementId = getImportId("createElement");

  const staticProps: t.ObjectProperty[] = [
    t.objectProperty(t.identifier("ref"), listCode.refCallback),
  ];
  for (const attr of node.openingElement.attributes) {
    if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
      const name = attr.name.name;
      if (name === "key" || name === "ref") continue;
      let value: t.Expression;
      if (!attr.value) {
        value = t.booleanLiteral(true);
      } else if (t.isStringLiteral(attr.value)) {
        value = attr.value;
      } else if (t.isJSXExpressionContainer(attr.value) && t.isExpression(attr.value.expression)) {
        value = attr.value.expression;
      } else {
        continue;
      }
      const propName = name === "class" ? "className" : name;
      staticProps.push(t.objectProperty(t.identifier(propName), value));
    }
  }

  const elemExpr = t.callExpression(createElementId, [
    t.stringLiteral(tagName),
    t.objectExpression(staticProps),
  ]);
  return t.logicalExpression(
    "||",
    t.memberExpression(listCode.cacheId, t.identifier("node")),
    t.assignmentExpression("=", t.memberExpression(listCode.cacheId, t.identifier("node")), elemExpr),
  );
};

const transformFragmentOptimization = (
  path: NodePath<t.JSXFragment>,
  state: PluginState,
): t.Expression => {
  const children = path.node.children.filter((childNode) => !(t.isJSXText(childNode) && !childNode.value.trim()));
  const elements: t.Expression[] = [];

  for (const child of children) {
    if (t.isJSXElement(child)) {
      const childPath = path.get("children").find((innerPath) => innerPath.node === child) as
        | NodePath<t.JSXElement>
        | undefined;
      if (childPath) {
        const tagName = getTagName(child);
        if (isComponent(tagName)) {
          elements.push(transformComponent(child, path));
        } else if (VOID_ELEMENTS.has(tagName) || containsComponent(child)) {
          elements.push(buildNativeElement(child, path, state));
        } else {
          const result = transformFullOptimization(childPath, state);
          elements.push(result);
        }
      }
    } else if (t.isJSXExpressionContainer(child)) {
      if (!t.isJSXEmptyExpression(child.expression)) {
        elements.push(child.expression);
      }
    } else if (t.isJSXText(child)) {
      const text = child.value.trim();
      if (text) elements.push(t.stringLiteral(text));
    }
  }

  return t.arrayExpression(elements);
};

const transformPartialOptimization = (
  path: NodePath<t.JSXElement>,
  state: PluginState,
  _targets: { node: t.JSXElement; isRoot: boolean }[],
): t.Expression | null => {
  return transformAsReactElement(path, state);
};

const transformAsReactElement = (
  path: NodePath<t.JSXElement>,
  state: PluginState,
): t.Expression => {
  const node = path.node;
  const tagName = getTagName(node);
  const createElementId = registerImportMethod(path, "createElement", "react");

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
      t.objectProperty(name.includes("-") ? t.stringLiteral(name) : t.identifier(name), value),
    );
  }

  const childExprs = buildReactChildren(node.children, path, state);
  const propsArg = props.length > 0 ? t.objectExpression(props) : t.nullLiteral();

  if (childExprs.length === 0) {
    return t.callExpression(createElementId, [t.stringLiteral(tagName), propsArg]);
  }

  return t.callExpression(createElementId, [t.stringLiteral(tagName), propsArg, ...childExprs]);
};

const buildReactChildren = (
  children: t.JSXElement["children"],
  path: NodePath,
  state: PluginState,
): t.Expression[] => {
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
      const childTag = getTagName(child);
      if (isComponent(childTag)) {
        exprs.push(transformComponent(child, path));
      } else if (VOID_ELEMENTS.has(childTag) || containsComponent(child)) {
        exprs.push(buildNativeElement(child, path, state));
      } else {
        const childPath = path.get("children")?.find?.((p: NodePath) => p.node === child) as
          | NodePath<t.JSXElement>
          | undefined;
        if (childPath) {
          const result = transformFullOptimization(childPath, state);
          exprs.push(result);
        } else {
          exprs.push(buildNativeElement(child, path, state));
        }
      }
    }
  }
  return exprs;
};

const buildChildrenTemplateHtml = (node: t.JSXElement, parentSVG: boolean) => {
  const tagName = getTagName(node);
  const isSVG = parentSVG || isSVGElement(tagName);

  const createElementCallee = undefined;
  const result = buildTemplateHtml(node, isSVG, createElementCallee);

  const innerHtml = stripOuterTag(result.html, tagName);

  return {
    html: innerHtml,
    fullHtml: result.html,
    isSVG: result.isSVG,
    holes: result.holes,
    inserts: result.inserts,
  };
};

const stripOuterTag = (html: string, tagName: string): string => {
  const openTag = html.indexOf(">");
  const closeTag = html.lastIndexOf(`</${tagName}>`);
  if (openTag === -1 || closeTag === -1) return html;
  return html.substring(openTag + 1, closeTag);
};

const buildRootProps = (node: t.JSXElement): t.ObjectProperty[] => {
  const props: t.ObjectProperty[] = [];

  for (const attr of node.openingElement.attributes) {
    if (t.isJSXSpreadAttribute(attr)) continue;

    const attrName = t.isJSXIdentifier(attr.name)
      ? attr.name.name
      : `${attr.name.namespace.name}:${attr.name.name.name}`;

    if (attrName === "ref" || attrName === "key" || attrName === "children") continue;
    if (attrName.startsWith("on") && attrName[2] && attrName[2] === attrName[2].toUpperCase()) {
      continue;
    }
    if (attrName === "dangerouslySetInnerHTML") continue;

    let value: t.Expression | null = null;
    if (attr.value === null) {
      value = t.booleanLiteral(true);
    } else if (t.isStringLiteral(attr.value)) {
      value = attr.value;
    } else if (t.isJSXExpressionContainer(attr.value)) {
      if (t.isJSXEmptyExpression(attr.value.expression)) continue;
      value = attr.value.expression;
    }

    if (value) {
      const propKey = attrName.includes("-") ? t.stringLiteral(attrName) : t.identifier(attrName);
      props.push(t.objectProperty(propKey, value));
    }
  }

  return props;
};

const registerSSRFlag = (state: PluginState, path: NodePath): t.Identifier => {
  if (state.ssrFlagId) return state.ssrFlagId;
  const id = t.identifier("_SSR$");
  state.ssrFlagId = id;
  const programPath = path.findParent((ancestor) => ancestor.isProgram());
  if (programPath) {
    (programPath as NodePath<t.Program>).unshiftContainer(
      "body",
      t.variableDeclaration("const", [
        t.variableDeclarator(
          id,
          t.binaryExpression(
            "===",
            t.unaryExpression("typeof", t.identifier("window")),
            t.stringLiteral("undefined"),
          ),
        ),
      ]),
    );
  }
  return id;
};

const injectHooksIntoFunction = (path: NodePath, statements: t.Statement[]): void => {
  let funcPath = path.getFunctionParent();
  if (!funcPath) return;

  const body = funcPath.get("body");
  if (!body || !("node" in body) || !t.isBlockStatement(body.node)) return;

  const bodyStatements = (body as NodePath<t.BlockStatement>).get("body");
  let insertIndex = 0;

  for (let i = 0; i < bodyStatements.length; i++) {
    const stmt = bodyStatements[i]!;
    if (stmt.isVariableDeclaration()) {
      const decls = stmt.get("declarations");
      const firstDecl = decls[0];
      if (firstDecl) {
        const init = firstDecl.get("init");
        if (init && init.isCallExpression()) {
          const callee = init.get("callee");
          if (callee.isIdentifier()) {
            const name = callee.node.name;
            if (name === "useState" || name === "useReducer" || name.startsWith("use") || name.startsWith("_$use")) {
              insertIndex = i + 1;
              continue;
            }
          }
        }
        // Skip cache init patterns: _c = _r.current || (_r.current = [])
        if (init && init.isLogicalExpression()) {
          insertIndex = i + 1;
          continue;
        }
      }
    }
    break;
  }

  for (let i = statements.length - 1; i >= 0; i--) {
    (body as NodePath<t.BlockStatement>).node.body.splice(insertIndex, 0, statements[i]!);
  }
};

const evaluateAttributes = (path: NodePath<t.JSXElement>): void => {
  const attrs = path.get("openingElement").get("attributes");
  for (const attr of attrs) {
    if (!attr.isJSXAttribute()) continue;
    const valuePath = attr.get("value");
    if (!valuePath.isJSXExpressionContainer()) continue;
    const exprPath = valuePath.get("expression") as NodePath;
    if (exprPath.isJSXEmptyExpression()) continue;

    const result = exprPath.evaluate();
    if (result.confident) {
      const { value } = result;
      if (typeof value === "string") {
        exprPath.replaceWith(t.stringLiteral(value));
      } else if (typeof value === "number") {
        exprPath.replaceWith(t.numericLiteral(value));
      } else if (typeof value === "boolean") {
        exprPath.replaceWith(t.booleanLiteral(value));
      }
    }
  }
};

const transformComponent = (node: t.JSXElement, path: NodePath): t.Expression => {
  const tagName = getTagName(node);
  const parts = tagName.split(".");
  let callee: t.Expression;
  if (parts.length === 1) {
    callee = t.identifier(parts[0]!);
  } else {
    callee = parts
      .slice(1)
      .reduce<t.Expression>(
        (obj, prop) => t.memberExpression(obj, t.identifier(prop)),
        t.identifier(parts[0]!),
      );
  }

  const props: Array<t.ObjectProperty | t.SpreadElement> = [];
  let keyExpr: t.Expression | null = null;
  for (const attr of node.openingElement.attributes) {
    if (t.isJSXSpreadAttribute(attr)) {
      props.push(t.spreadElement(attr.argument));
      continue;
    }
    const name = t.isJSXIdentifier(attr.name)
      ? attr.name.name
      : `${attr.name.namespace.name}:${attr.name.name.name}`;
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
    if (name === "key") {
      keyExpr = value;
      continue;
    }
    props.push(
      t.objectProperty(name.includes("-") ? t.stringLiteral(name) : t.identifier(name), value),
    );
  }

  const childExprs = buildComponentChildren(node.children, path);
  if (childExprs.length === 1) {
    props.push(t.objectProperty(t.identifier("children"), childExprs[0]!));
  } else if (childExprs.length > 1) {
    props.push(t.objectProperty(t.identifier("children"), t.arrayExpression(childExprs)));
  }

  if (keyExpr) {
    props.push(t.objectProperty(t.identifier("key"), keyExpr));
  }

  const propsArg = props.length > 0 ? t.objectExpression(props) : t.nullLiteral();
  const createElementId = registerImportMethod(path, "createElement", "react");

  return t.callExpression(createElementId, [callee, propsArg]);
};

const buildComponentChildren = (
  children: t.JSXElement["children"],
  path: NodePath,
): t.Expression[] => {
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
      exprs.push(buildChildElement(child, path));
    } else if (t.isJSXFragment(child)) {
      const fragmentChildren = buildComponentChildren(child.children, path);
      exprs.push(...fragmentChildren);
    }
  }
  return exprs;
};

const buildChildElement = (node: t.JSXElement, path: NodePath): t.Expression => {
  const tagName = getTagName(node);
  const createElementId = registerImportMethod(path, "createElement", "react");

  let callee: t.Expression;
  if (isComponent(tagName)) {
    const parts = tagName.split(".");
    if (parts.length === 1) {
      callee = t.identifier(parts[0]!);
    } else {
      callee = parts
        .slice(1)
        .reduce<t.Expression>(
          (obj, prop) => t.memberExpression(obj, t.identifier(prop)),
          t.identifier(parts[0]!),
        );
    }
  } else {
    callee = t.stringLiteral(tagName);
  }

  const props: Array<t.ObjectProperty | t.SpreadElement> = [];
  let keyExpr: t.Expression | null = null;
  for (const attr of node.openingElement.attributes) {
    if (t.isJSXSpreadAttribute(attr)) {
      props.push(t.spreadElement(attr.argument));
      continue;
    }
    const name = t.isJSXIdentifier(attr.name)
      ? attr.name.name
      : `${attr.name.namespace.name}:${attr.name.name.name}`;
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
    if (name === "key") {
      keyExpr = value;
      continue;
    }
    props.push(
      t.objectProperty(name.includes("-") ? t.stringLiteral(name) : t.identifier(name), value),
    );
  }

  if (keyExpr) {
    props.push(t.objectProperty(t.identifier("key"), keyExpr));
  }

  const childExprs = buildComponentChildren(node.children, path);
  const propsArg = props.length > 0 ? t.objectExpression(props) : t.nullLiteral();

  if (childExprs.length === 0) {
    return t.callExpression(createElementId, [callee, propsArg]);
  }
  return t.callExpression(createElementId, [callee, propsArg, ...childExprs]);
};

const buildNativeElement = (
  node: t.JSXElement,
  path: NodePath,
  state: PluginState,
): t.Expression => {
  const listResult = tryBuildListElement(node, path, state);
  if (listResult) return listResult;

  const tagName = getTagName(node);
  const createElementId = registerImportMethod(path, "createElement", "react");

  const props: Array<t.ObjectProperty | t.SpreadElement> = [];
  let keyExpr: t.Expression | null = null;
  for (const attr of node.openingElement.attributes) {
    if (t.isJSXSpreadAttribute(attr)) {
      props.push(t.spreadElement(attr.argument));
      continue;
    }
    const name = t.isJSXIdentifier(attr.name)
      ? attr.name.name
      : `${attr.name.namespace.name}:${attr.name.name.name}`;
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
    if (name === "key") {
      keyExpr = value;
      continue;
    }
    props.push(
      t.objectProperty(name.includes("-") ? t.stringLiteral(name) : t.identifier(name), value),
    );
  }

  if (keyExpr) {
    props.push(t.objectProperty(t.identifier("key"), keyExpr));
  }

  const childExprs = buildReactChildren(node.children, path, state);
  const propsArg = props.length > 0 ? t.objectExpression(props) : t.nullLiteral();

  if (childExprs.length === 0) {
    return t.callExpression(createElementId, [t.stringLiteral(tagName), propsArg]);
  }
  return t.callExpression(createElementId, [t.stringLiteral(tagName), propsArg, ...childExprs]);
};

const tryBuildListElement = (
  node: t.JSXElement,
  path: NodePath,
  state: PluginState,
): t.Expression | null => {
  const tagName = getTagName(node);
  const meaningfulChildren = node.children.filter(
    (childNode) => !(t.isJSXText(childNode) && !childNode.value.trim()),
  );
  if (meaningfulChildren.length !== 1) return null;

  const child = meaningfulChildren[0];
  if (!t.isJSXExpressionContainer(child) || t.isJSXEmptyExpression(child.expression)) return null;
  if (!t.isCallExpression(child.expression)) return null;

  const mapAnalysis = analyzeMapExpression(child.expression);
  if (!mapAnalysis) return null;

  const getImportId: ImportResolver = (name) => {
    if (name === "useRef" || name === "createElement") {
      return registerImportMethod(path, name, "react");
    }
    return registerImportMethod(path, name);
  };

  const instanceIndex = ++state.templateCounter;
  const listCode = generateListCode(mapAnalysis, getImportId, instanceIndex);

  injectHooksIntoFunction(path, listCode.cacheStatements);
  const patchStatements = t.isBlockStatement(listCode.patchBlock)
    ? listCode.patchBlock.body
    : [listCode.patchBlock];
  injectHooksIntoFunction(path, patchStatements);

  const createElementId = registerImportMethod(path, "createElement", "react");

  const staticProps: t.ObjectProperty[] = [
    t.objectProperty(t.identifier("ref"), listCode.refCallback),
  ];
  for (const attr of node.openingElement.attributes) {
    if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
      const name = attr.name.name;
      if (name === "key" || name === "ref") continue;
      let value: t.Expression;
      if (!attr.value) {
        value = t.booleanLiteral(true);
      } else if (t.isStringLiteral(attr.value)) {
        value = attr.value;
      } else if (t.isJSXExpressionContainer(attr.value) && t.isExpression(attr.value.expression)) {
        value = attr.value.expression;
      } else {
        continue;
      }
      const propName = name === "class" ? "className" : name;
      staticProps.push(t.objectProperty(t.identifier(propName), value));
    }
  }

  const elemExpr = t.callExpression(createElementId, [
    t.stringLiteral(tagName),
    t.objectExpression(staticProps),
  ]);
  return t.logicalExpression(
    "||",
    t.memberExpression(listCode.cacheId, t.identifier("node")),
    t.assignmentExpression("=", t.memberExpression(listCode.cacheId, t.identifier("node")), elemExpr),
  );
};

const isDynamicTag = (node: t.JSXElement): boolean => {
  const name = node.openingElement.name;
  if (t.isJSXIdentifier(name)) {
    const first = name.name[0];
    return first !== undefined && first === first.toLowerCase() && /[^a-z]/.test(name.name);
  }
  return false;
};
