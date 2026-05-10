declare module "@babel/helper-module-imports" {
  import type { NodePath } from "@babel/core";
  import type * as t from "@babel/types";

  interface ImportOptions {
    nameHint?: string;
    importedType?: "type" | "typeof" | "value";
    blockHoist?: number;
  }

  export function addNamed(
    path: NodePath,
    name: string,
    source: string,
    opts?: ImportOptions,
  ): t.Identifier;

  export function addDefault(
    path: NodePath,
    source: string,
    opts?: ImportOptions,
  ): t.Identifier;

  export function addNamespace(
    path: NodePath,
    source: string,
    opts?: ImportOptions,
  ): t.Identifier;
}

declare module "@babel/plugin-syntax-jsx" {
  const plugin: any;
  export default plugin;
}
