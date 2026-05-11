import type * as t from "@babel/types";
import type { NodePath } from "@babel/core";

export interface TemplateInfo {
  id: t.Identifier;
  html: string;
  isSVG: boolean;
  isFragment: boolean;
}

export interface DomProtocolEntry {
  bindingName: string;
  createFn: t.ArrowFunctionExpression;
  patchFn: t.ArrowFunctionExpression;
}

export interface PluginState {
  templates: Map<string, TemplateInfo>;
  templateCounter: number;
  delegatedEvents: Set<string>;
  programPath: NodePath<t.Program> | null;
  ssrFlagId?: t.Identifier;
  ssr: boolean;
  pendingDomProtocols?: DomProtocolEntry[];
  lastListCacheId?: t.Identifier | null;
}

export type ImportResolver = (name: string) => t.Identifier;
