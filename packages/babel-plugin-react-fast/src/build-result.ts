import * as t from "@babel/types";
import type { DynamicHole, TemplateWalkStep, InsertHole } from "./generate-template.js";

export interface WalkResult {
  statements: t.Statement[];
  walkedIds: Map<string, t.Identifier>;
}

export const buildDOMWalk = (
  rootExpr: t.Expression,
  holes: DynamicHole[],
  inserts: InsertHole[],
): WalkResult => {
  const statements: t.Statement[] = [];
  const walkedIds = new Map<string, t.Identifier>();
  let walkCounter = 0;

  const nextId = (): t.Identifier => {
    walkCounter++;
    return t.identifier(`_el$${walkCounter}`);
  };

  const allPaths = collectAllWalkPaths(holes, inserts);

  for (const pathKey of allPaths) {
    const steps = pathKey.split(".");
    let accessExpr: t.Expression = rootExpr;

    for (let i = 0; i < steps.length; i++) {
      const partialKey = steps.slice(0, i + 1).join(".");
      if (walkedIds.has(partialKey)) {
        accessExpr = walkedIds.get(partialKey)!;
        continue;
      }

      const parentKey = steps.slice(0, i).join(".");
      const parentId = parentKey ? walkedIds.get(parentKey) : null;
      const base = parentId || (i === 0 ? rootExpr : accessExpr);

      const stepId = nextId();
      const memberExpr = t.memberExpression(base, t.identifier(steps[i]!));
      statements.push(t.variableDeclaration("const", [t.variableDeclarator(stepId, memberExpr)]));
      walkedIds.set(partialKey, stepId);
      accessExpr = stepId;
    }
  }

  return { statements, walkedIds };
};

export const getElementFromWalk = (
  walkPath: TemplateWalkStep[],
  walkedIds: Map<string, t.Identifier>,
  rootExpr: t.Expression,
): t.Expression => {
  if (walkPath.length === 0) return rootExpr;
  const pathKey = walkPath.map((step) => step.method).join(".");
  return walkedIds.get(pathKey) || rootExpr;
};

const collectAllWalkPaths = (holes: DynamicHole[], inserts: InsertHole[]): string[] => {
  const paths = new Set<string>();

  for (const hole of holes) {
    const pathKey = hole.walkPath.map((step) => step.method).join(".");
    if (pathKey) paths.add(pathKey);
  }

  for (const insert of inserts) {
    const pathKey = insert.walkPath.map((step) => step.method).join(".");
    if (pathKey) paths.add(pathKey);
    const parentKey = insert.walkPath
      .slice(0, -1)
      .map((step) => step.method)
      .join(".");
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

  return [...withIntermediates].sort((pathA, pathB) => {
    const depthA = pathA.split(".").length;
    const depthB = pathB.split(".").length;
    if (depthA !== depthB) return depthA - depthB;
    return pathA.localeCompare(pathB);
  });
};

export const isProvablyFunction = (expr: t.Expression): boolean => {
  return t.isArrowFunctionExpression(expr) || t.isFunctionExpression(expr);
};
