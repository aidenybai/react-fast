import type { PluginObj, NodePath } from "@babel/core";
import * as t from "@babel/types";
import { transformJSXElement, transformJSXFragment } from "./transform.js";
import { registerImportMethod } from "./shared/utils.js";
import type { PluginState } from "./shared/types.js";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const jsxSyntaxPlugin = require("@babel/plugin-syntax-jsx");

interface PluginOptions {
  ssr?: boolean;
}

const OPT_OUT_DIRECTIVE = "use no fast";

const reactFastPlugin = (_: unknown, options: PluginOptions = {}): PluginObj<PluginState> => {
  const enableSSR = options.ssr !== false;
  return {
    name: "babel-plugin-react-fast",
    inherits: jsxSyntaxPlugin.default as PluginObj,

    visitor: {
      Program: {
        enter(_path, state) {
          state.templates = new Map();
          state.templateCounter = 0;
          state.delegatedEvents = new Set();
          state.programPath = null;
          state.ssr = enableSSR;
        },

        exit(path, state) {
          if (state.templates.size === 0 && state.delegatedEvents.size === 0) {
            return;
          }

          emitTemplateDeclarations(path, state);
          emitDelegatedEvents(path, state);
          emitDomProtocolAssignments(path, state);
        },
      },

      JSXElement: {
        enter(path, state) {
          if (isInsideJSX(path)) return;
          if (hasOptOutDirective(path)) return;

          ensureBlockBody(path);

          const result = transformJSXElement(path, state);
          if (result) {
            path.replaceWith(result);
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

const emitTemplateDeclarations = (
  path: NodePath<t.Program>,
  state: PluginState,
): void => {
  const hoistedDeclarators: t.VariableDeclarator[] = [];

  for (const [, templateInfo] of state.templates) {
    const templateImportId = registerImportMethod(path, "template");
    const args: t.Expression[] = [t.stringLiteral(templateInfo.html)];
    if (templateInfo.isFragment || templateInfo.isSVG) {
      args.push(t.booleanLiteral(templateInfo.isFragment));
      if (templateInfo.isSVG) {
        args.push(t.booleanLiteral(true));
      }
    }

    hoistedDeclarators.push(
      t.variableDeclarator(
        templateInfo.id,
        t.addComment(t.callExpression(templateImportId, args), "leading", "#__PURE__"),
      ),
    );
  }

  if (hoistedDeclarators.length === 0) return;

  const declaration = t.variableDeclaration("const", hoistedDeclarators);
  const lastImport = path
    .get("body")
    .filter((bodyPath) => bodyPath.isImportDeclaration())
    .pop();

  if (lastImport) {
    lastImport.insertAfter(declaration);
  } else {
    path.unshiftContainer("body", declaration);
  }
};

const emitDelegatedEvents = (
  path: NodePath<t.Program>,
  state: PluginState,
): void => {
  if (state.delegatedEvents.size === 0) return;

  const delegateImportId = registerImportMethod(path, "delegateEvents");
  path.pushContainer(
    "body",
    t.expressionStatement(
      t.callExpression(delegateImportId, [
        t.arrayExpression([...state.delegatedEvents].map((eventName) => t.stringLiteral(eventName))),
      ]),
    ),
  );
};

// __dom protocol assignments must come before any render() calls
const emitDomProtocolAssignments = (
  path: NodePath<t.Program>,
  state: PluginState,
): void => {
  if (!state.pendingDomProtocols || state.pendingDomProtocols.length === 0) return;

  const bodyPaths = path.get("body");
  for (const protocol of state.pendingDomProtocols) {
    const assignmentStatement = t.expressionStatement(
      t.assignmentExpression(
        "=",
        t.memberExpression(t.identifier(protocol.bindingName), t.identifier("__dom")),
        t.objectExpression([
          t.objectProperty(t.identifier("c"), protocol.createFn),
          t.objectProperty(t.identifier("p"), protocol.patchFn),
        ]),
      ),
    );

    let didInsert = false;
    for (let index = 0; index < bodyPaths.length; index++) {
      const statement = bodyPaths[index];
      if (statement.isVariableDeclaration()) {
        for (const declarator of statement.node.declarations) {
          if (t.isIdentifier(declarator.id) && declarator.id.name === protocol.bindingName) {
            statement.insertAfter(assignmentStatement);
            didInsert = true;
            break;
          }
        }
      } else if (statement.isFunctionDeclaration() && statement.node.id?.name === protocol.bindingName) {
        statement.insertAfter(assignmentStatement);
        didInsert = true;
      }
      if (didInsert) break;
    }
    if (!didInsert) {
      path.pushContainer("body", assignmentStatement);
    }
  }
};

const ensureBlockBody = (path: NodePath): void => {
  const functionPath = path.getFunctionParent();
  if (!functionPath) return;
  if (
    t.isArrowFunctionExpression(functionPath.node) &&
    !t.isBlockStatement(functionPath.node.body)
  ) {
    (functionPath as NodePath<t.ArrowFunctionExpression>).ensureBlock();
  }
};

const isInsideJSX = (path: NodePath): boolean => {
  let ancestor = path.parentPath;
  while (ancestor) {
    if (ancestor.isJSXElement() || ancestor.isJSXFragment()) return true;
    ancestor = ancestor.parentPath;
  }
  return false;
};

const hasOptOutDirective = (path: NodePath): boolean => {
  const functionParent = path.getFunctionParent();
  if (!functionParent) return false;
  const body = functionParent.get("body");
  if (!body || !("node" in body) || !t.isBlockStatement(body.node)) return false;
  const block = body.node as t.BlockStatement;
  if (block.directives) {
    for (const directive of block.directives) {
      if (directive.value.value === OPT_OUT_DIRECTIVE) return true;
    }
  }
  const firstStatement = block.body[0];
  if (
    t.isExpressionStatement(firstStatement) &&
    t.isStringLiteral(firstStatement.expression) &&
    firstStatement.expression.value === OPT_OUT_DIRECTIVE
  ) {
    return true;
  }
  return false;
};

export default reactFastPlugin;
