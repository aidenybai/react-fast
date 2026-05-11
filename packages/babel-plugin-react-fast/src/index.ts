import type { PluginObj, NodePath } from "@babel/core";
import * as t from "@babel/types";
import { transformJSXElement, transformJSXFragment } from "./transform.js";
import { registerImportMethod } from "./shared/utils.js";
import type { PluginState } from "./shared/types.js";

interface PluginOptions {
  ssr?: boolean;
}

const reactFastPlugin = (_: unknown, options: PluginOptions = {}): PluginObj<PluginState> => {
  const ssr = options.ssr !== false;
  return {
    name: "babel-plugin-react-fast",
    inherits: require("@babel/plugin-syntax-jsx").default,

    visitor: {
      Program: {
        enter(_path, state) {
          state.templates = new Map();
          state.templateCounter = 0;
          state.delegatedEvents = new Set();
          state.programPath = null;
          state.ssr = ssr;
        },

        exit(path, state) {
          if (state.templates.size === 0 && state.delegatedEvents.size === 0) {
            return;
          }

          const hoistedDeclarators: t.VariableDeclarator[] = [];

          for (const [, info] of state.templates) {
            const templateImportId = registerImportMethod(path, "template");
            const args: t.Expression[] = [t.stringLiteral(info.html)];
            if (info.isFragment || info.isSVG) {
              args.push(t.booleanLiteral(info.isFragment));
              if (info.isSVG) {
                args.push(t.booleanLiteral(true));
              }
            }

            hoistedDeclarators.push(
              t.variableDeclarator(
                info.id,
                t.addComment(t.callExpression(templateImportId, args), "leading", "#__PURE__"),
              ),
            );
          }

          if (hoistedDeclarators.length > 0) {
            const decl = t.variableDeclaration("const", hoistedDeclarators);
            const lastImport = path
              .get("body")
              .filter((p) => p.isImportDeclaration())
              .pop();

            if (lastImport) {
              lastImport.insertAfter(decl);
            } else {
              path.unshiftContainer("body", decl);
            }
          }

          if (state.delegatedEvents.size > 0) {
            const delegateImportId = registerImportMethod(path, "delegateEvents");
            path.pushContainer(
              "body",
              t.expressionStatement(
                t.callExpression(delegateImportId, [
                  t.arrayExpression([...state.delegatedEvents].map((e) => t.stringLiteral(e))),
                ]),
              ),
            );
          }

          // Emit __dom protocol assignments — must come before any render() calls
          if (state.pendingDomProtocols && state.pendingDomProtocols.length > 0) {
            const body = path.get("body");
            // Find insertion point: after the component declaration
            for (const dp of state.pendingDomProtocols) {
              const assignStmt = t.expressionStatement(
                t.assignmentExpression(
                  "=",
                  t.memberExpression(t.identifier(dp.bindingName), t.identifier("__dom")),
                  t.objectExpression([
                    t.objectProperty(t.identifier("c"), dp.createFn),
                    t.objectProperty(t.identifier("p"), dp.patchFn),
                  ]),
                ),
              );
              // Find the declaration of the component and insert after it
              let inserted = false;
              for (let i = 0; i < body.length; i++) {
                const stmt = body[i];
                if (stmt.isVariableDeclaration()) {
                  for (const decl of stmt.node.declarations) {
                    if (t.isIdentifier(decl.id) && decl.id.name === dp.bindingName) {
                      stmt.insertAfter(assignStmt);
                      inserted = true;
                      break;
                    }
                  }
                } else if (stmt.isFunctionDeclaration() && stmt.node.id?.name === dp.bindingName) {
                  stmt.insertAfter(assignStmt);
                  inserted = true;
                }
                if (inserted) break;
              }
              if (!inserted) {
                path.pushContainer("body", assignStmt);
              }
            }
          }
        },
      },

      JSXElement: {
        enter(path, state) {
          if (isInsideJSX(path)) return;
          if (hasOptOutDirective(path)) return;

          ensureBlockBody(path);

          const prevListCacheId = state.lastListCacheId;
          state.lastListCacheId = null;

          const result = transformJSXElement(path, state);
          const listCacheId = state.lastListCacheId;
          state.lastListCacheId = prevListCacheId;

          if (result) {
            if (listCacheId && path.parentPath?.isReturnStatement()) {
              // Cache entire return tree: DOM is updated by _lc$.u() before return,
              // so React sees the same element and bails out of reconciliation entirely
              const cached = t.logicalExpression(
                "||",
                t.memberExpression(listCacheId, t.identifier("ret")),
                t.assignmentExpression("=", t.memberExpression(listCacheId, t.identifier("ret")), result),
              );
              path.replaceWith(cached);
            } else {
              path.replaceWith(result);
            }
          }
        },
      },

      JSXFragment: {
        enter(path, state) {
          if (isInsideJSX(path)) return;
          if (hasOptOutDirective(path)) return;

          ensureBlockBody(path);

          const result = transformJSXFragment(path, state);
          if (result) {
            path.replaceWith(result);
          }
        },
      },
    },
  };
};

const ensureBlockBody = (path: NodePath): void => {
  const funcPath = path.getFunctionParent();
  if (!funcPath) return;
  if (
    t.isArrowFunctionExpression(funcPath.node) &&
    !t.isBlockStatement(funcPath.node.body)
  ) {
    (funcPath as NodePath<t.ArrowFunctionExpression>).ensureBlock();
  }
};

const isInsideJSX = (path: NodePath): boolean => {
  let current = path.parentPath;
  while (current) {
    if (current.isJSXElement() || current.isJSXFragment()) return true;
    current = current.parentPath;
  }
  return false;
};

const hasOptOutDirective = (path: NodePath): boolean => {
  const funcParent = path.getFunctionParent();
  if (!funcParent) return false;
  const body = funcParent.get("body");
  if (!body || !("node" in body) || !t.isBlockStatement(body.node)) return false;
  const block = body.node as t.BlockStatement;
  if (block.directives) {
    for (const d of block.directives) {
      if (d.value.value === "use no fast") return true;
    }
  }
  const first = block.body[0];
  if (
    t.isExpressionStatement(first) &&
    t.isStringLiteral(first.expression) &&
    first.expression.value === "use no fast"
  ) {
    return true;
  }
  return false;
};

export default reactFastPlugin;
