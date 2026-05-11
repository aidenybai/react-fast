import * as t from "@babel/types";
import type { DynamicHole, InsertHole, TemplateWalkStep } from "./generate-template.js";

export interface DomProtocolOutput {
  createFn: t.ArrowFunctionExpression;
  patchFn: t.ArrowFunctionExpression;
  delegatedEvents: Set<string>;
  hoistedDeclarations: t.Statement[];
}

export const generateDomProtocol = (
  tagName: string,
  templateId: t.Identifier,
  holes: DynamicHole[],
  inserts: InsertHole[],
  componentParams: t.Pattern[],
  instanceIndex: number,
  fullTemplateId?: t.Identifier,
): DomProtocolOutput => {
  const cacheId = t.identifier("_c");
  const elId = t.identifier("_el");
  const delegatedEvents = new Set<string>();
  const hoistedDeclarations: t.Statement[] = [];
  let hoistedHandlerCounter = 0;

  const allPaths = collectAllPaths(holes, inserts);
  const terminalPaths = new Set<string>();
  for (const hole of holes) {
    const key = hole.walkPath.map((s) => s.method).join(".");
    if (key) terminalPaths.add(key);
  }
  for (const insert of inserts) {
    const key = insert.walkPath.map((s) => s.method).join(".");
    if (key) terminalPaths.add(key);
    const parentKey = findParentPath(insert.walkPath);
    if (parentKey) terminalPaths.add(parentKey);
  }

  const pathToSlot = new Map<string, number>();
  const intermediateLocals = new Map<string, string>();
  let slotCounter = 0;
  let localCounter = 0;

  for (const pathKey of allPaths) {
    if (terminalPaths.has(pathKey)) {
      pathToSlot.set(pathKey, slotCounter++);
    } else {
      intermediateLocals.set(pathKey, `_n$${localCounter++}`);
    }
  }

  // --- Build walk statements ---
  const walkStatements: t.Statement[] = [];
  for (const pathKey of allPaths) {
    const steps = pathKey.split(".");
    let accessExpr: t.Expression = elId;

    for (let i = 0; i < steps.length; i++) {
      const partialKey = steps.slice(0, i + 1).join(".");
      if (partialKey !== pathKey) {
        const partialSlot = pathToSlot.get(partialKey);
        if (partialSlot !== undefined) {
          accessExpr = t.memberExpression(cacheId, t.numericLiteral(partialSlot), true);
        } else {
          const localName = intermediateLocals.get(partialKey);
          if (localName) {
            accessExpr = t.identifier(localName);
          } else {
            accessExpr = t.memberExpression(accessExpr, t.identifier(steps[i]!));
          }
        }
      } else {
        accessExpr = t.memberExpression(accessExpr, t.identifier(steps[i]!));
      }
    }

    if (terminalPaths.has(pathKey)) {
      const slot = pathToSlot.get(pathKey)!;
      walkStatements.push(
        t.expressionStatement(
          t.assignmentExpression("=", t.memberExpression(cacheId, t.numericLiteral(slot), true), accessExpr),
        ),
      );
    } else {
      const localName = intermediateLocals.get(pathKey)!;
      walkStatements.push(t.variableDeclaration("const", [t.variableDeclarator(t.identifier(localName), accessExpr)]));
    }
  }

  // --- Build init body (for create) and patch body ---
  const initBody: t.Statement[] = [];
  const patchBody: t.Statement[] = [];
  const freeVarStores: t.Statement[] = [];
  const storedFreeVars = new Set<string>();

  const attrCacheSlots: { slot: number; expression: t.Expression; elementExpr: t.Expression; name: string }[] = [];
  const insertCacheSlots: { slot: number; markerExpr: t.Expression; valueExpr: t.Expression }[] = [];

  for (const hole of holes) {
    const pathKey = hole.walkPath.map((s) => s.method).join(".");
    const slot = pathKey ? pathToSlot.get(pathKey) : undefined;
    const elementExpr: t.Expression =
      slot !== undefined
        ? t.memberExpression(cacheId, t.numericLiteral(slot), true)
        : elId;

    switch (hole.kind) {
      case "event": {
        const eventName = hole.name!;
        if (hole.isDelegated) {
          delegatedEvents.add(eventName);
          if (t.isArrowFunctionExpression(hole.expression) && hole.expression.params.length === 0) {
            const freeVars = collectFreeVars(hole.expression);
            if (freeVars.size > 0) {
              const handlerName = `_$dp${instanceIndex}_${hoistedHandlerCounter++}`;
              const dataParam = t.identifier("_d");
              const rewrittenBody = rewriteFreeVars(hole.expression.body, freeVars, dataParam);
              hoistedDeclarations.push(
                t.variableDeclaration("const", [
                  t.variableDeclarator(t.identifier(handlerName), t.arrowFunctionExpression([dataParam], rewrittenBody)),
                ]),
              );

              for (const varName of freeVars) {
                if (!storedFreeVars.has(varName)) {
                  storedFreeVars.add(varName);
                  freeVarStores.push(
                    t.expressionStatement(
                      t.assignmentExpression(
                        "=",
                        t.memberExpression(cacheId, t.identifier(`_ev_${varName}`)),
                        t.identifier(varName),
                      ),
                    ),
                  );
                }
              }

              initBody.push(
                t.expressionStatement(
                  t.assignmentExpression("=", t.memberExpression(elementExpr, t.identifier(`$$${eventName}`)), t.identifier(handlerName)),
                ),
                t.expressionStatement(
                  t.assignmentExpression("=", t.memberExpression(elementExpr, t.identifier(`$$${eventName}Data`)), cacheId),
                ),
              );
            } else {
              initBody.push(
                t.expressionStatement(
                  t.assignmentExpression(
                    "=",
                    t.memberExpression(elementExpr, t.identifier(`$$${eventName}`)),
                    t.cloneNode(hole.expression, true),
                  ),
                ),
              );
            }
          } else {
            const expr = t.cloneNode(hole.expression, true);
            initBody.push(
              t.expressionStatement(
                t.assignmentExpression("=", t.memberExpression(elementExpr, t.identifier(`$$${eventName}`)), expr),
              ),
            );
            patchBody.push(
              t.expressionStatement(
                t.assignmentExpression(
                  "=",
                  t.memberExpression(elementExpr, t.identifier(`$$${eventName}`)),
                  t.cloneNode(hole.expression, true),
                ),
              ),
            );
          }
        }
        break;
      }
      case "attribute": {
        if (hole.isAttribute) {
          break;
        }
        const attrCacheSlot = slotCounter++;
        const attrCacheExpr = t.memberExpression(cacheId, t.numericLiteral(attrCacheSlot), true);
        const attrTempId = t.identifier(`_a$${attrCacheSlot}`);
        patchBody.push(
          t.variableDeclaration("const", [t.variableDeclarator(attrTempId, t.cloneNode(hole.expression, true))]),
          t.ifStatement(
            t.binaryExpression("!==", attrCacheExpr, attrTempId),
            t.blockStatement([
              t.expressionStatement(t.assignmentExpression("=", attrCacheExpr, attrTempId)),
              t.expressionStatement(
                t.assignmentExpression("=", t.memberExpression(elementExpr, t.identifier(hole.name!)), attrTempId),
              ),
            ]),
          ),
        );
        attrCacheSlots.push({ slot: attrCacheSlot, expression: t.cloneNode(hole.expression, true), elementExpr, name: hole.name! });
        break;
      }
      default:
        break;
    }
  }

  for (let i = 0; i < inserts.length; i++) {
    const insert = inserts[i]!;
    const markerPathKey = insert.walkPath.map((s) => s.method).join(".");
    const markerSlot = pathToSlot.get(markerPathKey);
    const markerExpr =
      markerSlot !== undefined
        ? t.memberExpression(cacheId, t.numericLiteral(markerSlot), true)
        : elId;

    const valueExpr = unwrapThunk(t.cloneNode(insert.expression, true));
    const cacheSlot = slotCounter++;
    const cachedExpr = t.memberExpression(cacheId, t.numericLiteral(cacheSlot), true);

    const tempId = t.identifier(`_v$${i}`);
    patchBody.push(
      t.variableDeclaration("const", [t.variableDeclarator(tempId, valueExpr)]),
      t.ifStatement(
        t.binaryExpression("!==", cachedExpr, tempId),
        t.blockStatement([
          t.expressionStatement(t.assignmentExpression("=", cachedExpr, tempId)),
          t.expressionStatement(
            t.assignmentExpression("=", t.memberExpression(markerExpr, t.identifier("data")), t.binaryExpression("+", t.stringLiteral(""), tempId)),
          ),
        ]),
      ),
    );
    insertCacheSlots.push({ slot: cacheSlot, markerExpr, valueExpr: unwrapThunk(t.cloneNode(insert.expression, true)) });
  }

  for (const { slot, expression, elementExpr, name } of attrCacheSlots) {
    initBody.push(
      t.expressionStatement(
        t.assignmentExpression(
          "=",
          t.memberExpression(cacheId, t.numericLiteral(slot), true),
          t.assignmentExpression("=", t.memberExpression(elementExpr, t.identifier(name)), expression),
        ),
      ),
    );
  }

  for (const { slot, markerExpr, valueExpr } of insertCacheSlots) {
    initBody.push(
      t.expressionStatement(t.assignmentExpression("=", t.memberExpression(cacheId, t.numericLiteral(slot), true), valueExpr)),
      t.expressionStatement(
        t.assignmentExpression(
          "=",
          t.memberExpression(markerExpr, t.identifier("data")),
          t.binaryExpression("+", t.stringLiteral(""), t.cloneNode(valueExpr, true)),
        ),
      ),
    );
  }

  // --- Assemble __dom.c (create) ---
  const createPreamble: t.Statement[] = fullTemplateId
    ? [
        t.variableDeclaration("const", [
          t.variableDeclarator(elId, t.callExpression(fullTemplateId, [])),
        ]),
      ]
    : [
        t.variableDeclaration("const", [
          t.variableDeclarator(elId, t.callExpression(t.memberExpression(t.identifier("document"), t.identifier("createElement")), [t.stringLiteral(tagName)])),
        ]),
        t.expressionStatement(
          t.callExpression(t.memberExpression(elId, t.identifier("appendChild")), [t.callExpression(templateId, [])]),
        ),
      ];

  const createBody: t.Statement[] = [
    ...createPreamble,
    t.variableDeclaration("const", [t.variableDeclarator(cacheId, t.arrayExpression([]))]),
    ...walkStatements,
    ...freeVarStores,
    ...initBody,
    t.expressionStatement(t.assignmentExpression("=", t.memberExpression(elId, t.identifier("__c")), cacheId)),
    t.returnStatement(elId),
  ];

  const createFn = t.arrowFunctionExpression(
    componentParams.map((p) => t.cloneNode(p, true)),
    t.blockStatement(createBody),
  );

  // --- Assemble __dom.p (patch) ---
  const patchFreeVarStores = freeVarStores.map((s) => t.cloneNode(s, true));
  const patchBodyStatements: t.Statement[] = [
    t.variableDeclaration("const", [
      t.variableDeclarator(t.cloneNode(cacheId), t.memberExpression(t.cloneNode(elId), t.identifier("__c"))),
    ]),
    ...patchFreeVarStores,
    ...patchBody,
  ];

  const patchFn = t.arrowFunctionExpression(
    [t.cloneNode(elId), ...componentParams.map((p) => t.cloneNode(p, true))],
    t.blockStatement(patchBodyStatements),
  );

  return { createFn, patchFn, delegatedEvents, hoistedDeclarations };
};

// --- Shared helpers (duplicated from generate-hooks.ts for isolation) ---

const collectAllPaths = (holes: DynamicHole[], inserts: InsertHole[]): string[] => {
  const paths = new Set<string>();
  for (const hole of holes) {
    const key = hole.walkPath.map((s) => s.method).join(".");
    if (key) paths.add(key);
  }
  for (const insert of inserts) {
    const key = insert.walkPath.map((s) => s.method).join(".");
    if (key) paths.add(key);
    const parentKey = insert.walkPath.slice(0, -1).map((s) => s.method).join(".");
    if (parentKey) paths.add(parentKey);
  }
  const withIntermediates = new Set<string>();
  for (const path of paths) {
    withIntermediates.add(path);
    const steps = path.split(".");
    for (let i = 1; i < steps.length; i++) {
      withIntermediates.add(steps.slice(0, i).join("."));
    }
  }
  return [...withIntermediates].sort((a, b) => {
    const aDepth = a.split(".").length;
    const bDepth = b.split(".").length;
    if (aDepth !== bDepth) return aDepth - bDepth;
    return a.localeCompare(b);
  });
};

const findParentPath = (walkPath: TemplateWalkStep[]): string => {
  let lastFirstChildIdx = -1;
  for (let i = walkPath.length - 1; i >= 0; i--) {
    if (walkPath[i]!.method === "firstChild") {
      lastFirstChildIdx = i;
      break;
    }
  }
  if (lastFirstChildIdx <= 0) return "";
  return walkPath.slice(0, lastFirstChildIdx).map((s) => s.method).join(".");
};

const unwrapThunk = (expr: t.Expression): t.Expression => {
  if (t.isArrowFunctionExpression(expr) && expr.params.length === 0 && t.isExpression(expr.body)) {
    return expr.body;
  }
  return expr;
};

const collectFreeVars = (fn: t.ArrowFunctionExpression): Set<string> => {
  const freeVars = new Set<string>();
  const declared = new Set<string>();
  const globals = new Set(["undefined", "null", "true", "false", "NaN", "Infinity", "console", "Math", "Date", "JSON", "Object", "Array", "String", "Number", "Boolean", "Promise", "Symbol", "Map", "Set", "WeakMap", "WeakSet", "Error", "TypeError", "parseInt", "parseFloat", "isNaN", "isFinite"]);

  const visit = (node: t.Node): void => {
    if (t.isIdentifier(node)) return;
    if (t.isVariableDeclaration(node)) {
      for (const decl of node.declarations) {
        if (t.isIdentifier(decl.id)) declared.add(decl.id.name);
        if (decl.init) visit(decl.init);
      }
      return;
    }
    if (t.isMemberExpression(node)) {
      if (t.isIdentifier(node.object) && !declared.has(node.object.name)) freeVars.add(node.object.name);
      else visit(node.object);
      if (node.computed && node.property) visit(node.property);
      return;
    }
    if (t.isCallExpression(node)) {
      if (t.isIdentifier(node.callee) && !declared.has(node.callee.name)) freeVars.add(node.callee.name);
      else visit(node.callee);
      for (const arg of node.arguments) visit(arg);
      return;
    }
    if (t.isConditionalExpression(node)) { visit(node.test); visit(node.consequent); visit(node.alternate); return; }
    if (t.isBinaryExpression(node) || t.isLogicalExpression(node)) { visit(node.left); visit(node.right); return; }
    if (t.isUnaryExpression(node)) { visit(node.argument); return; }
    if (t.isObjectExpression(node)) { for (const p of node.properties) { if (t.isObjectProperty(p)) visit(p.value); } return; }
    if (t.isTemplateLiteral(node)) { for (const e of node.expressions) visit(e); return; }
    if (t.isExpressionStatement(node)) { visit(node.expression); return; }
    if (t.isBlockStatement(node)) { for (const s of node.body) visit(s); return; }
    if (t.isReturnStatement(node) && node.argument) { visit(node.argument); return; }
  };

  if (t.isExpression(fn.body)) visit(fn.body);
  else visit(fn.body);

  for (const g of globals) freeVars.delete(g);
  return freeVars;
};

const rewriteFreeVars = (body: t.Expression | t.BlockStatement, freeVars: Set<string>, dataParam: t.Identifier): t.Expression | t.BlockStatement => {
  const cloned = t.cloneNode(body, true);
  rewriteNode(cloned, freeVars, dataParam);
  return cloned;
};

const rewriteNode = (node: t.Node, freeVars: Set<string>, dataParam: t.Identifier): void => {
  if (t.isMemberExpression(node)) {
    if (t.isIdentifier(node.object) && freeVars.has(node.object.name)) {
      (node as any).object = t.memberExpression(dataParam, t.identifier(`_ev_${node.object.name}`));
    } else {
      rewriteNode(node.object, freeVars, dataParam);
    }
    if (node.computed && node.property) rewriteNode(node.property, freeVars, dataParam);
    return;
  }
  if (t.isCallExpression(node)) {
    if (t.isIdentifier(node.callee) && freeVars.has(node.callee.name)) {
      (node as any).callee = t.memberExpression(dataParam, t.identifier(`_ev_${node.callee.name}`));
    } else {
      rewriteNode(node.callee, freeVars, dataParam);
    }
    for (const arg of node.arguments) rewriteNode(arg, freeVars, dataParam);
    return;
  }
  if (t.isConditionalExpression(node)) { rewriteNode(node.test, freeVars, dataParam); rewriteNode(node.consequent, freeVars, dataParam); rewriteNode(node.alternate, freeVars, dataParam); return; }
  if (t.isBinaryExpression(node) || t.isLogicalExpression(node)) { rewriteNode(node.left, freeVars, dataParam); rewriteNode(node.right, freeVars, dataParam); return; }
  if (t.isUnaryExpression(node)) { rewriteNode(node.argument, freeVars, dataParam); return; }
  if (t.isObjectExpression(node)) { for (const p of node.properties) { if (t.isObjectProperty(p)) { if (p.computed) rewriteNode(p.key, freeVars, dataParam); rewriteNode(p.value, freeVars, dataParam); } } return; }
  if (t.isTemplateLiteral(node)) { for (const e of node.expressions) rewriteNode(e, freeVars, dataParam); return; }
  if (t.isExpressionStatement(node)) { rewriteNode(node.expression, freeVars, dataParam); return; }
  if (t.isBlockStatement(node)) { for (const s of node.body) rewriteNode(s, freeVars, dataParam); return; }
  if (t.isReturnStatement(node) && node.argument) { rewriteNode(node.argument, freeVars, dataParam); return; }
};
