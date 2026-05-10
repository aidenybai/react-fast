import type { PluginObj, NodePath } from "@babel/core";
import * as t from "@babel/types";
import { addNamed } from "@babel/helper-module-imports";
import { transformJSXElement, transformJSXFragment } from "./transform.js";
import { MODULE_NAME } from "./shared/constants.js";
import type { TemplateInfo } from "./generate-template.js";

interface PluginState {
  templates: Map<string, TemplateInfo>;
  templateCounter: number;
  elementCounter: number;
  delegatedEvents: Set<string>;
  runtimeImports: Set<string>;
  importIdentifiers: Map<string, t.Identifier>;
  programPath: NodePath<t.Program> | null;
}

const RUNTIME_IMPORT_ALIASES: Record<string, string> = {
  template: "_$template",
  effect: "_$effect",
  insert: "_$insert",
  spread: "_$spread",
  use: "_$use",
  style: "_$style",
  classList: "_$classList",
  setAttribute: "_$setAttribute",
  delegateEvents: "_$delegateEvents",
};

const reactFastPlugin = (): PluginObj<PluginState> => {
  return {
    name: "babel-plugin-react-fast",
    inherits: require("@babel/plugin-syntax-jsx").default,

    visitor: {
      Program: {
        enter(path, state) {
          state.templates = new Map();
          state.templateCounter = 0;
          state.elementCounter = 0;
          state.delegatedEvents = new Set();
          state.runtimeImports = new Set();
          state.importIdentifiers = new Map();
          state.programPath = path;
        },

        exit(path, state) {
          if (state.delegatedEvents.size > 0) {
            state.runtimeImports.add("delegateEvents");
          }

          if (state.templates.size === 0 && state.runtimeImports.size === 0) return;

          const importStatements: t.Statement[] = [];

          for (const importName of state.runtimeImports) {
            const alias = RUNTIME_IMPORT_ALIASES[importName] || `_$${importName}`;
            const id = addNamed(path, importName, MODULE_NAME, {
              nameHint: alias,
            });
            state.importIdentifiers.set(importName, id);
          }

          const templateDeclarations: t.Statement[] = [];
          for (const [, info] of state.templates) {
            const templateImportId = state.importIdentifiers.get("template");
            if (!templateImportId) continue;

            const args: t.Expression[] = [t.stringLiteral(info.html)];
            if (info.isSVG) {
              args.push(t.booleanLiteral(false));
              args.push(t.booleanLiteral(true));
            }

            templateDeclarations.push(
              t.variableDeclaration("const", [
                t.variableDeclarator(
                  info.id,
                  t.callExpression(templateImportId, args),
                ),
              ]),
            );
          }

          if (templateDeclarations.length > 0) {
            const lastImport = path.get("body").filter(
              (p) => p.isImportDeclaration(),
            ).pop();

            if (lastImport) {
              lastImport.insertAfter(templateDeclarations);
            } else {
              path.unshiftContainer("body", templateDeclarations);
            }
          }

          if (state.delegatedEvents.size > 0) {
            const delegateImportId = state.importIdentifiers.get("delegateEvents");
            if (delegateImportId) {
              path.pushContainer(
                "body",
                t.expressionStatement(
                  t.callExpression(delegateImportId, [
                    t.arrayExpression(
                      [...state.delegatedEvents].map((e) => t.stringLiteral(e)),
                    ),
                  ]),
                ),
              );
            }
          }
        },
      },

      JSXElement(path, state) {
        if (isInsideJSX(path)) return;

        const result = transformJSXElement(path, state);
        if (result) {
          path.replaceWith(result);
        }
      },

      JSXFragment(path, state) {
        if (isInsideJSX(path)) return;

        const result = transformJSXFragment(path, state);
        if (result) {
          path.replaceWith(result);
        }
      },
    },
  };
};

const isInsideJSX = (path: NodePath): boolean => {
  let current = path.parentPath;
  while (current) {
    if (current.isJSXElement() || current.isJSXFragment()) return true;
    current = current.parentPath;
  }
  return false;
};

export default reactFastPlugin;
