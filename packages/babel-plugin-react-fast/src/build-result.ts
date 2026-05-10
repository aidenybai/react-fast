import * as t from "@babel/types";
import type { DynamicHole, TemplateWalkStep, ComponentInsert } from "./generate-template.js";
import { DELEGATED_EVENTS } from "./shared/constants.js";

export interface BuildOutput {
  statements: t.Statement[];
  returnId: t.Identifier;
  delegatedEvents: Set<string>;
}

export const buildResult = (
  templateId: t.Identifier,
  rootId: t.Identifier,
  holes: DynamicHole[],
  componentInserts: ComponentInsert[],
  runtimeImports: Set<string>,
): BuildOutput => {
  const statements: t.Statement[] = [];
  const delegatedEvents = new Set<string>();

  statements.push(
    t.variableDeclaration("const", [
      t.variableDeclarator(rootId, t.callExpression(templateId, [])),
    ]),
  );

  const walkedIds = new Map<string, t.Identifier>();
  let walkCounter = 0;

  const nextId = (): t.Identifier => {
    walkCounter++;
    return t.identifier(`_el$${walkCounter}`);
  };

  const getElementId = (walkPath: TemplateWalkStep[]): t.Identifier => {
    if (walkPath.length === 0) return rootId;

    const pathKey = walkPath.map((s) => s.method).join(".");
    const existing = walkedIds.get(pathKey);
    if (existing) return existing;

    let currentExpr: t.Expression = rootId;
    let accumulatedKey = "";

    for (let i = 0; i < walkPath.length; i++) {
      const step = walkPath[i]!;
      accumulatedKey += (accumulatedKey ? "." : "") + step.method;

      const existingIntermediate = walkedIds.get(accumulatedKey);
      if (existingIntermediate) {
        currentExpr = existingIntermediate;
        continue;
      }

      const stepId = nextId();
      const accessExpr = t.memberExpression(currentExpr, t.identifier(step.method));
      statements.push(
        t.variableDeclaration("const", [
          t.variableDeclarator(stepId, accessExpr),
        ]),
      );
      walkedIds.set(accumulatedKey, stepId);
      currentExpr = stepId;
    }

    return walkedIds.get(pathKey)!;
  };

  const expressionStatements: t.Statement[] = [];
  const dynamics: Array<{ elementId: t.Identifier; hole: DynamicHole }> = [];

  for (const hole of holes) {
    const elementId = getElementId(hole.walkPath);

    switch (hole.kind) {
      case "ref": {
        runtimeImports.add("use");
        expressionStatements.push(
          t.expressionStatement(
            t.callExpression(t.identifier("_$use"), [hole.expression, elementId]),
          ),
        );
        break;
      }
      case "event": {
        const eventName = hole.name!;
        if (hole.isDelegated) {
          delegatedEvents.add(eventName);
          expressionStatements.push(
            t.expressionStatement(
              t.assignmentExpression(
                "=",
                t.memberExpression(elementId, t.identifier(`$$${eventName}`)),
                hole.expression,
              ),
            ),
          );
        } else {
          expressionStatements.push(
            t.expressionStatement(
              t.callExpression(
                t.memberExpression(elementId, t.identifier("addEventListener")),
                [t.stringLiteral(eventName), hole.expression],
              ),
            ),
          );
        }
        break;
      }
      case "spread": {
        runtimeImports.add("spread");
        expressionStatements.push(
          t.expressionStatement(
            t.callExpression(t.identifier("_$spread"), [elementId, hole.expression]),
          ),
        );
        break;
      }
      case "style": {
        dynamics.push({ elementId, hole });
        break;
      }
      case "classList": {
        dynamics.push({ elementId, hole });
        break;
      }
      case "text": {
        dynamics.push({ elementId, hole });
        break;
      }
      case "attribute": {
        dynamics.push({ elementId, hole });
        break;
      }
    }
  }

  for (const insert of componentInserts) {
    runtimeImports.add("insert");
    const markerId = getElementId(insert.walkPath);
    expressionStatements.push(
      t.expressionStatement(
        t.callExpression(t.identifier("_$insert"), [
          rootId,
          insert.expression,
          markerId,
        ]),
      ),
    );
  }

  statements.push(...expressionStatements);

  if (dynamics.length > 0) {
    runtimeImports.add("effect");
    const cacheKeys = dynamics.map((_, i) => String.fromCharCode(97 + i));
    const prevParam = t.identifier("_prev");

    const effectBody: t.Statement[] = [];

    const valueDeclarations: t.VariableDeclarator[] = [];
    for (let i = 0; i < dynamics.length; i++) {
      const { hole } = dynamics[i]!;
      valueDeclarations.push(
        t.variableDeclarator(t.identifier(`_v$${i}`), hole.expression),
      );
    }
    effectBody.push(t.variableDeclaration("const", valueDeclarations));

    for (let i = 0; i < dynamics.length; i++) {
      const { elementId, hole } = dynamics[i]!;
      const key = cacheKeys[i]!;
      const valueId = t.identifier(`_v$${i}`);
      const prevAccess = t.memberExpression(prevParam, t.identifier(key));

      let assignment: t.Expression;

      switch (hole.kind) {
        case "text": {
          const textNodeAccess = t.memberExpression(elementId, t.identifier("firstChild"));
          assignment = t.assignmentExpression(
            "=",
            t.memberExpression(textNodeAccess, t.identifier("data")),
            t.assignmentExpression("=", prevAccess, valueId),
          );
          break;
        }
        case "attribute": {
          if (hole.name === "innerHTML") {
            assignment = t.assignmentExpression(
              "=",
              t.memberExpression(elementId, t.identifier("innerHTML")),
              t.assignmentExpression("=", prevAccess, valueId),
            );
          } else if (hole.isAttribute) {
            runtimeImports.add("setAttribute");
            assignment = t.sequenceExpression([
              t.callExpression(t.identifier("_$setAttribute"), [
                elementId,
                t.stringLiteral(hole.name!),
                valueId,
              ]),
              t.assignmentExpression("=", prevAccess, valueId),
            ]);
          } else {
            assignment = t.assignmentExpression(
              "=",
              t.memberExpression(elementId, t.identifier(hole.name!)),
              t.assignmentExpression("=", prevAccess, valueId),
            );
          }
          break;
        }
        case "style": {
          runtimeImports.add("style");
          assignment = t.assignmentExpression(
            "=",
            prevAccess,
            t.callExpression(t.identifier("_$style"), [elementId, valueId, prevAccess]),
          );
          break;
        }
        case "classList": {
          runtimeImports.add("classList");
          assignment = t.assignmentExpression(
            "=",
            prevAccess,
            t.callExpression(t.identifier("_$classList"), [elementId, valueId, prevAccess]),
          );
          break;
        }
        default:
          assignment = t.assignmentExpression("=", prevAccess, valueId);
      }

      effectBody.push(
        t.ifStatement(
          t.binaryExpression("!==", valueId, prevAccess),
          t.expressionStatement(assignment),
        ),
      );
    }

    effectBody.push(t.returnStatement(prevParam));

    const initialCacheProps = cacheKeys.map((key) =>
      t.objectProperty(t.identifier(key), t.identifier("undefined")),
    );

    statements.push(
      t.expressionStatement(
        t.callExpression(t.identifier("_$effect"), [
          t.arrowFunctionExpression(
            [prevParam],
            t.blockStatement(effectBody),
          ),
          t.objectExpression(initialCacheProps),
        ]),
      ),
    );
  }

  statements.push(t.returnStatement(rootId));

  return { statements, returnId: rootId, delegatedEvents };
};
