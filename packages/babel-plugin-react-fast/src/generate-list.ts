import * as t from "@babel/types";
import type { MapAnalysis } from "./analyze.js";
import type { ImportResolver } from "./shared/types.js";

export interface ListOutput {
  cacheStatements: t.Statement[];
  refCallback: t.Expression;
  patchBlock: t.Statement;
  cacheId: t.Identifier;
}

export const generateListCode = (
  analysis: MapAnalysis,
  getImportId: ImportResolver,
  instanceIndex: number,
): ListOutput => {
  const cacheId = t.identifier(`_lc$${instanceIndex}`);
  const refId = t.identifier(`_lr$${instanceIndex}`);
  const useRefId = getImportId("useRef");
  const reconcileId = getImportId("reconcileArrays");
  const compId = t.identifier(analysis.componentName);
  const domAccess = t.memberExpression(compId, t.identifier("__dom"));

  const cacheStatements: t.Statement[] = [
    t.variableDeclaration("const", [t.variableDeclarator(refId, t.callExpression(useRefId, []))]),
    t.variableDeclaration("const", [
      t.variableDeclarator(
        cacheId,
        t.logicalExpression(
          "||",
          t.memberExpression(refId, t.identifier("current")),
          t.assignmentExpression(
            "=",
            t.memberExpression(refId, t.identifier("current")),
            t.objectExpression([
              t.objectProperty(t.identifier("n"), t.arrayExpression([])),
              t.objectProperty(t.identifier("k"), t.newExpression(t.identifier("Map"), [])),
              t.objectProperty(t.identifier("d"), t.nullLiteral()),
              t.objectProperty(t.identifier("s"), t.numericLiteral(0)),
              t.objectProperty(t.identifier("e"), t.nullLiteral()),
            ]),
          ),
        ),
      ),
    ]),
  ];

  const refFnBody = t.arrowFunctionExpression(
    [t.identifier("_el")],
    t.blockStatement([
      t.ifStatement(t.unaryExpression("!", t.identifier("_el")), t.returnStatement()),
      t.expressionStatement(
        t.assignmentExpression("=", t.memberExpression(cacheId, t.identifier("e")), t.identifier("_el")),
      ),
      t.expressionStatement(
        t.callExpression(t.memberExpression(cacheId, t.identifier("u")), []),
      ),
    ]),
  );
  const refCallback = t.logicalExpression(
    "||",
    t.memberExpression(cacheId, t.identifier("r")),
    t.assignmentExpression("=", t.memberExpression(cacheId, t.identifier("r")), refFnBody),
  );

  const patchBlock = buildPatchBlock(cacheId, analysis, compId, domAccess, reconcileId);

  return { cacheStatements, refCallback, patchBlock, cacheId };
};

const buildPatchBlock = (
  cacheId: t.Identifier,
  analysis: MapAnalysis,
  compId: t.Identifier,
  domAccess: t.Expression,
  reconcileId: t.Identifier,
): t.Statement => {
  const parentEl = t.memberExpression(cacheId, t.identifier("e"));
  const nodes = t.memberExpression(cacheId, t.identifier("n"));
  const keyMap = t.memberExpression(cacheId, t.identifier("k"));
  const prevData = t.memberExpression(cacheId, t.identifier("d"));
  const prevSel = t.memberExpression(cacheId, t.identifier("s"));
  const dataLocal = t.identifier("_d");
  const selExpr = analysis.selectorInfo ? t.cloneNode(analysis.selectorInfo.selectorVar, true) : null;

  const buildProps = (itemExpr: t.Expression, indexExpr: t.Expression): t.ObjectExpression => {
    const properties: t.ObjectProperty[] = [];
    for (const prop of analysis.props) {
      let value = t.cloneNode(prop.value, true);
      value = rewriteItemRefs(value, analysis.itemParam, itemExpr, indexExpr);
      properties.push(t.objectProperty(t.identifier(prop.name), value));
    }
    return t.objectExpression(properties);
  };

  const iVar = t.identifier("_i");
  const itemVar = t.identifier("_item");
  const keyVar = t.identifier("_key");

  const keyFromItem = rewriteItemRefs(
    t.cloneNode(analysis.keyExpr, true),
    analysis.itemParam,
    itemVar,
    iVar,
  );

  const buildEpilogue = (): t.Statement[] => [
    t.expressionStatement(t.assignmentExpression("=", t.cloneNode(prevData, true), dataLocal)),
    ...(selExpr ? [t.expressionStatement(t.assignmentExpression("=", t.cloneNode(prevSel, true), t.cloneNode(selExpr, true)))] : []),
  ];

  // --- 1. Same data fast path (O(1) select) — early return, no epilogue needed ---
  const sameDataBody: t.Statement[] = [];
  if (selExpr) {
    const selLocal = t.identifier("_sel");
    const oldIdx = t.identifier("_oi");
    const newIdx = t.identifier("_ni");

    sameDataBody.push(
      t.variableDeclaration("const", [t.variableDeclarator(selLocal, t.cloneNode(selExpr, true))]),
      t.ifStatement(
        t.binaryExpression("!==", selLocal, t.cloneNode(prevSel, true)),
        t.blockStatement([
          t.variableDeclaration("const", [
            t.variableDeclarator(oldIdx, t.callExpression(t.memberExpression(t.cloneNode(keyMap, true), t.identifier("get")), [t.cloneNode(prevSel, true)])),
          ]),
          t.ifStatement(
            t.binaryExpression("!==", oldIdx, t.identifier("undefined")),
            t.expressionStatement(
              t.callExpression(t.memberExpression(t.cloneNode(domAccess, true), t.identifier("p")), [
                t.memberExpression(t.cloneNode(nodes, true), oldIdx, true),
                buildPropsWithOverride(analysis, t.memberExpression(dataLocal, oldIdx, true), oldIdx, analysis.selectorInfo!.propName, t.booleanLiteral(false)),
              ]),
            ),
          ),
          t.variableDeclaration("const", [
            t.variableDeclarator(newIdx, t.callExpression(t.memberExpression(t.cloneNode(keyMap, true), t.identifier("get")), [selLocal])),
          ]),
          t.ifStatement(
            t.binaryExpression("!==", newIdx, t.identifier("undefined")),
            t.expressionStatement(
              t.callExpression(t.memberExpression(t.cloneNode(domAccess, true), t.identifier("p")), [
                t.memberExpression(t.cloneNode(nodes, true), newIdx, true),
                buildPropsWithOverride(analysis, t.memberExpression(dataLocal, newIdx, true), newIdx, analysis.selectorInfo!.propName, t.booleanLiteral(true)),
              ]),
            ),
          ),
          t.expressionStatement(t.assignmentExpression("=", t.cloneNode(prevSel, true), selLocal)),
        ]),
      ),
    );
  }
  sameDataBody.push(t.returnStatement());

  // --- 2. Clear fast path ---
  const clearBody: t.Statement[] = [
    t.expressionStatement(t.assignmentExpression("=", t.memberExpression(t.cloneNode(parentEl, true), t.identifier("textContent")), t.stringLiteral(""))),
    t.expressionStatement(t.assignmentExpression("=", t.cloneNode(nodes, true), t.arrayExpression([]))),
    t.expressionStatement(t.callExpression(t.memberExpression(t.cloneNode(keyMap, true), t.identifier("clear")), [])),
    ...buildEpilogue(),
    t.returnStatement(),
  ];

  // --- 3. Create all fast path ---
  const fragId = t.identifier("_f");
  const createAllBody: t.Statement[] = [
    t.variableDeclaration("const", [
      t.variableDeclarator(fragId, t.callExpression(t.memberExpression(t.identifier("document"), t.identifier("createDocumentFragment")), [])),
    ]),
    t.expressionStatement(t.assignmentExpression("=", t.cloneNode(nodes, true), t.newExpression(t.identifier("Array"), [t.memberExpression(dataLocal, t.identifier("length"))]))),
    t.expressionStatement(t.callExpression(t.memberExpression(t.cloneNode(keyMap, true), t.identifier("clear")), [])),
    t.forStatement(
      t.variableDeclaration("let", [t.variableDeclarator(iVar, t.numericLiteral(0))]),
      t.binaryExpression("<", iVar, t.memberExpression(dataLocal, t.identifier("length"))),
      t.updateExpression("++", iVar),
      t.blockStatement([
        t.variableDeclaration("const", [t.variableDeclarator(itemVar, t.memberExpression(dataLocal, iVar, true))]),
        t.variableDeclaration("const", [
          t.variableDeclarator(
            t.identifier("_el"),
            t.callExpression(t.memberExpression(t.cloneNode(domAccess, true), t.identifier("c")), [buildProps(itemVar, iVar)]),
          ),
        ]),
        t.expressionStatement(t.assignmentExpression("=", t.memberExpression(t.cloneNode(nodes, true), iVar, true), t.identifier("_el"))),
        t.expressionStatement(
          t.callExpression(t.memberExpression(t.cloneNode(keyMap, true), t.identifier("set")), [
            rewriteItemRefs(t.cloneNode(analysis.keyExpr, true), analysis.itemParam, itemVar, iVar),
            iVar,
          ]),
        ),
        t.expressionStatement(t.callExpression(t.memberExpression(fragId, t.identifier("appendChild")), [t.identifier("_el")])),
      ]),
    ),
    t.expressionStatement(t.callExpression(t.memberExpression(t.cloneNode(parentEl, true), t.identifier("appendChild")), [fragId])),
    ...buildEpilogue(),
    t.returnStatement(),
  ];

  // --- 4. Same-order in-place fast path ---
  // Direct key comparison: _item.id !== _lc.d[_i].id (no Map.get!)
  const prevItemKey = rewriteItemRefs(
    t.cloneNode(analysis.keyExpr, true),
    analysis.itemParam,
    t.memberExpression(t.cloneNode(prevData, true), iVar, true),
    iVar,
  );
  const soFlag = t.identifier("_so");
  const sameOrderLoop = t.forStatement(
    t.variableDeclaration("let", [t.variableDeclarator(iVar, t.numericLiteral(0))]),
    t.binaryExpression("<", iVar, t.memberExpression(dataLocal, t.identifier("length"))),
    t.updateExpression("++", iVar),
    t.blockStatement([
      t.variableDeclaration("const", [t.variableDeclarator(itemVar, t.memberExpression(dataLocal, iVar, true))]),
      // Identity-first: unchanged items skip key comparison and patch entirely
      t.ifStatement(
        t.binaryExpression("===", itemVar, t.memberExpression(t.cloneNode(prevData, true), iVar, true)),
        t.continueStatement(),
      ),
      t.ifStatement(
        t.binaryExpression("!==", t.cloneNode(keyFromItem, true), t.cloneNode(prevItemKey, true)),
        t.blockStatement([
          t.expressionStatement(t.assignmentExpression("=", soFlag, t.booleanLiteral(false))),
          t.breakStatement(),
        ]),
      ),
      t.expressionStatement(
        t.callExpression(t.memberExpression(t.cloneNode(domAccess, true), t.identifier("p")), [
          t.memberExpression(t.cloneNode(nodes, true), iVar, true),
          buildProps(itemVar, iVar),
        ]),
      ),
    ]),
  );

  const sameOrderBlock = t.ifStatement(
    t.binaryExpression("===",
      t.memberExpression(dataLocal, t.identifier("length")),
      t.memberExpression(t.cloneNode(nodes, true), t.identifier("length")),
    ),
    t.blockStatement([
      t.variableDeclaration("let", [t.variableDeclarator(soFlag, t.booleanLiteral(true))]),
      sameOrderLoop,
      t.ifStatement(soFlag, t.blockStatement([...buildEpilogue(), t.returnStatement()])),
    ]),
  );

  // --- 4.5. Single-deletion fast path ---
  // If data shrank by 1, find deletion point via identity scan, remove DOM node directly
  const delIdx = t.identifier("_di");
  const deletionFastPath = t.ifStatement(
    t.binaryExpression("===",
      t.memberExpression(dataLocal, t.identifier("length")),
      t.binaryExpression("-", t.memberExpression(t.cloneNode(nodes, true), t.identifier("length")), t.numericLiteral(1)),
    ),
    t.blockStatement([
      // Find deletion index: scan until identity mismatch
      t.variableDeclaration("let", [t.variableDeclarator(delIdx, t.numericLiteral(0))]),
      t.whileStatement(
        t.logicalExpression("&&",
          t.binaryExpression("<", delIdx, t.memberExpression(dataLocal, t.identifier("length"))),
          t.binaryExpression("===", t.memberExpression(dataLocal, delIdx, true), t.memberExpression(t.cloneNode(prevData, true), delIdx, true)),
        ),
        t.expressionStatement(t.updateExpression("++", delIdx)),
      ),
      // Verify: item after deletion point shifted from prevData[_di+1]
      t.ifStatement(
        t.logicalExpression("||",
          t.binaryExpression(">=", delIdx, t.memberExpression(dataLocal, t.identifier("length"))),
          t.binaryExpression("===",
            t.memberExpression(dataLocal, delIdx, true),
            t.memberExpression(t.cloneNode(prevData, true), t.binaryExpression("+", delIdx, t.numericLiteral(1)), true),
          ),
        ),
        t.blockStatement([
          t.expressionStatement(
            t.callExpression(
              t.memberExpression(t.cloneNode(parentEl, true), t.identifier("removeChild")),
              [t.memberExpression(t.cloneNode(nodes, true), delIdx, true)],
            ),
          ),
          t.expressionStatement(
            t.callExpression(t.memberExpression(t.cloneNode(nodes, true), t.identifier("splice")), [delIdx, t.numericLiteral(1)]),
          ),
          t.expressionStatement(t.callExpression(t.memberExpression(t.cloneNode(keyMap, true), t.identifier("clear")), [])),
          t.forStatement(
            t.variableDeclaration("let", [t.variableDeclarator(iVar, t.numericLiteral(0))]),
            t.binaryExpression("<", iVar, t.memberExpression(dataLocal, t.identifier("length"))),
            t.updateExpression("++", iVar),
            t.expressionStatement(
              t.callExpression(t.memberExpression(t.cloneNode(keyMap, true), t.identifier("set")), [
                rewriteItemRefs(t.cloneNode(analysis.keyExpr, true), analysis.itemParam, t.memberExpression(dataLocal, iVar, true), iVar),
                iVar,
              ]),
            ),
          ),
          ...buildEpilogue(),
          t.returnStatement(),
        ]),
      ),
    ]),
  );

  // --- 5. Full reconciliation ---
  const oldNodesId = t.identifier("_on");
  const newNodesId = t.identifier("_nn");
  const newKeyMapId = t.identifier("_nk");

  const reconcileBody: t.Statement[] = [
    t.variableDeclaration("const", [t.variableDeclarator(oldNodesId, t.cloneNode(nodes, true))]),
    t.variableDeclaration("const", [
      t.variableDeclarator(newNodesId, t.newExpression(t.identifier("Array"), [t.memberExpression(dataLocal, t.identifier("length"))])),
    ]),
    t.forStatement(
      t.variableDeclaration("let", [t.variableDeclarator(iVar, t.numericLiteral(0))]),
      t.binaryExpression("<", iVar, t.memberExpression(dataLocal, t.identifier("length"))),
      t.updateExpression("++", iVar),
      t.blockStatement([
        t.variableDeclaration("const", [t.variableDeclarator(itemVar, t.memberExpression(dataLocal, iVar, true))]),
        t.variableDeclaration("const", [
          t.variableDeclarator(
            t.identifier("_oi"),
            t.callExpression(t.memberExpression(t.cloneNode(keyMap, true), t.identifier("get")), [
              rewriteItemRefs(t.cloneNode(analysis.keyExpr, true), analysis.itemParam, itemVar, iVar),
            ]),
          ),
        ]),
        t.ifStatement(
          t.binaryExpression("!==", t.identifier("_oi"), t.identifier("undefined")),
          t.blockStatement([
            t.expressionStatement(t.assignmentExpression("=", t.memberExpression(newNodesId, iVar, true), t.memberExpression(oldNodesId, t.identifier("_oi"), true))),
            t.ifStatement(
              t.binaryExpression("!==", itemVar, t.memberExpression(t.cloneNode(prevData, true), t.identifier("_oi"), true)),
              t.expressionStatement(
                t.callExpression(t.memberExpression(t.cloneNode(domAccess, true), t.identifier("p")), [
                  t.memberExpression(newNodesId, iVar, true),
                  buildProps(itemVar, iVar),
                ]),
              ),
            ),
          ]),
          t.blockStatement([
            t.expressionStatement(
              t.assignmentExpression(
                "=",
                t.memberExpression(newNodesId, iVar, true),
                t.callExpression(t.memberExpression(t.cloneNode(domAccess, true), t.identifier("c")), [buildProps(itemVar, iVar)]),
              ),
            ),
          ]),
        ),
      ]),
    ),
    t.ifStatement(
      t.logicalExpression(
        "&&",
        t.memberExpression(oldNodesId, t.identifier("length")),
        t.memberExpression(newNodesId, t.identifier("length")),
      ),
      t.expressionStatement(t.callExpression(reconcileId, [t.cloneNode(parentEl, true), oldNodesId, newNodesId])),
      t.ifStatement(
        t.memberExpression(newNodesId, t.identifier("length")),
        t.blockStatement([
          t.variableDeclaration("const", [
            t.variableDeclarator(fragId, t.callExpression(t.memberExpression(t.identifier("document"), t.identifier("createDocumentFragment")), [])),
          ]),
          t.forStatement(
            t.variableDeclaration("let", [t.variableDeclarator(t.identifier("_j"), t.numericLiteral(0))]),
            t.binaryExpression("<", t.identifier("_j"), t.memberExpression(newNodesId, t.identifier("length"))),
            t.updateExpression("++", t.identifier("_j")),
            t.expressionStatement(t.callExpression(t.memberExpression(fragId, t.identifier("appendChild")), [t.memberExpression(newNodesId, t.identifier("_j"), true)])),
          ),
          t.expressionStatement(t.callExpression(t.memberExpression(t.cloneNode(parentEl, true), t.identifier("appendChild")), [fragId])),
        ]),
      ),
    ),
    t.expressionStatement(t.assignmentExpression("=", t.cloneNode(nodes, true), newNodesId)),
    // Rebuild keyMap in-place (avoid new Map allocation)
    t.expressionStatement(t.callExpression(t.memberExpression(t.cloneNode(keyMap, true), t.identifier("clear")), [])),
    t.forStatement(
      t.variableDeclaration("let", [t.variableDeclarator(t.identifier("_j"), t.numericLiteral(0))]),
      t.binaryExpression("<", t.identifier("_j"), t.memberExpression(dataLocal, t.identifier("length"))),
      t.updateExpression("++", t.identifier("_j")),
      t.expressionStatement(
        t.callExpression(t.memberExpression(t.cloneNode(keyMap, true), t.identifier("set")), [
          rewriteItemRefs(t.cloneNode(analysis.keyExpr, true), analysis.itemParam, t.memberExpression(dataLocal, t.identifier("_j"), true), t.identifier("_j")),
          t.identifier("_j"),
        ]),
      ),
    ),
    ...buildEpilogue(),
  ];

  // --- Assemble the update function with sequential early returns ---
  const updateBody: t.Statement[] = [
    t.variableDeclaration("const", [t.variableDeclarator(dataLocal, t.cloneNode(analysis.dataSource, true))]),
    t.ifStatement(t.binaryExpression("===", dataLocal, t.cloneNode(prevData, true)), t.blockStatement(sameDataBody)),
    t.ifStatement(t.binaryExpression("===", t.memberExpression(dataLocal, t.identifier("length")), t.numericLiteral(0)), t.blockStatement(clearBody)),
    t.ifStatement(t.binaryExpression("===", t.memberExpression(t.cloneNode(nodes, true), t.identifier("length")), t.numericLiteral(0)), t.blockStatement(createAllBody)),
    sameOrderBlock,
    deletionFastPath,
    ...reconcileBody,
  ];

  const updateFn = t.arrowFunctionExpression([], t.blockStatement(updateBody));

  const patchStatements: t.Statement[] = [
    t.expressionStatement(
      t.assignmentExpression("=", t.memberExpression(cacheId, t.identifier("u")), updateFn),
    ),
    t.ifStatement(
      t.memberExpression(cacheId, t.identifier("e")),
      t.expressionStatement(t.callExpression(t.memberExpression(cacheId, t.identifier("u")), [])),
    ),
  ];

  return t.blockStatement(patchStatements) as unknown as t.Statement;
};

const buildPropsWithOverride = (
  analysis: MapAnalysis,
  itemExpr: t.Expression,
  indexExpr: t.Expression,
  overrideProp: string,
  overrideValue: t.Expression,
): t.ObjectExpression => {
  const properties: t.ObjectProperty[] = [];
  for (const prop of analysis.props) {
    if (prop.name === overrideProp) {
      properties.push(t.objectProperty(t.identifier(prop.name), overrideValue));
    } else {
      let value = t.cloneNode(prop.value, true);
      value = rewriteItemRefs(value, analysis.itemParam, itemExpr, indexExpr);
      properties.push(t.objectProperty(t.identifier(prop.name), value));
    }
  }
  return t.objectExpression(properties);
};

const rewriteItemRefs = (
  expr: t.Expression,
  itemParam: t.Pattern,
  replacement: t.Expression,
  _indexExpr: t.Expression,
): t.Expression => {
  if (!t.isIdentifier(itemParam)) return expr;
  const paramName = itemParam.name;
  return rewriteIdentifier(expr, paramName, replacement);
};

const rewriteIdentifier = (expr: t.Expression, name: string, replacement: t.Expression): t.Expression => {
  if (t.isIdentifier(expr) && expr.name === name) {
    return t.cloneNode(replacement, true);
  }
  if (t.isMemberExpression(expr)) {
    expr.object = rewriteIdentifier(expr.object as t.Expression, name, replacement);
    return expr;
  }
  if (t.isBinaryExpression(expr)) {
    expr.left = rewriteIdentifier(expr.left as t.Expression, name, replacement);
    expr.right = rewriteIdentifier(expr.right as t.Expression, name, replacement);
    return expr;
  }
  if (t.isConditionalExpression(expr)) {
    expr.test = rewriteIdentifier(expr.test as t.Expression, name, replacement);
    expr.consequent = rewriteIdentifier(expr.consequent as t.Expression, name, replacement);
    expr.alternate = rewriteIdentifier(expr.alternate as t.Expression, name, replacement);
    return expr;
  }
  if (t.isCallExpression(expr)) {
    expr.callee = rewriteIdentifier(expr.callee as t.Expression, name, replacement);
    expr.arguments = expr.arguments.map((arg) => t.isExpression(arg) ? rewriteIdentifier(arg, name, replacement) : arg);
    return expr;
  }
  if (t.isObjectExpression(expr)) {
    for (const prop of expr.properties) {
      if (t.isObjectProperty(prop) && t.isExpression(prop.value)) {
        prop.value = rewriteIdentifier(prop.value, name, replacement);
      }
    }
    return expr;
  }
  if (t.isLogicalExpression(expr)) {
    expr.left = rewriteIdentifier(expr.left as t.Expression, name, replacement);
    expr.right = rewriteIdentifier(expr.right as t.Expression, name, replacement);
    return expr;
  }
  if (t.isUnaryExpression(expr)) {
    expr.argument = rewriteIdentifier(expr.argument as t.Expression, name, replacement);
    return expr;
  }
  if (t.isTemplateLiteral(expr)) {
    expr.expressions = expr.expressions.map((innerExpr) => t.isExpression(innerExpr) ? rewriteIdentifier(innerExpr, name, replacement) : innerExpr);
    return expr;
  }
  return expr;
};
