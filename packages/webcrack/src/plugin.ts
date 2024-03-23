import { parse } from '@babel/parser';
import template from '@babel/template';
import traverse, { visitors, type Visitor } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';

const stages = [
  'parse',
  'prepare',
  'deobfuscate',
  'unminify',
  'unpack',
] as const;

export type Stage = (typeof stages)[number];

export type PluginState = { opts: Record<string, unknown> };

export interface PluginObject {
  name?: string;
  runAfter: Stage;
  pre?: (this: PluginState, state: PluginState) => Promise<void> | void;
  post?: (this: PluginState, state: PluginState) => Promise<void> | void;
  visitor?: Visitor<PluginState>;
}

export interface PluginAPI {
  parse: typeof parse;
  types: typeof t;
  traverse: typeof traverse;
  template: typeof template;
  matchers: typeof m;
}

export type Plugin = (api: PluginAPI) => PluginObject;

export function loadPlugins(plugins: Plugin[]) {
  const groups = new Map<Stage, PluginObject[]>(
    stages.map((stage) => [stage, []]),
  );
  for (const plugin of plugins) {
    const obj = plugin({
      parse,
      types: t,
      traverse,
      template,
      matchers: m,
    });
    groups.get(obj.runAfter)?.push(obj);
  }
  return Object.fromEntries(
    [...groups].map(([stage, plugins]) => [
      stage,
      plugins.length
        ? async (ast: t.File) => {
            const state: PluginState = { opts: {} };
            for (const transform of plugins) {
              await transform.pre?.call(state, state);
            }

            const pluginVisitors = plugins.flatMap(
              (plugin) => plugin.visitor ?? [],
            );
            if (pluginVisitors.length > 0) {
              const mergedVisitor = visitors.merge(pluginVisitors);
              traverse(ast, mergedVisitor, undefined, state);
            }

            for (const plugin of plugins) {
              await plugin.post?.call(state, state);
            }
          }
        : undefined,
    ]),
  ) as Record<Stage, (ast: t.File) => Promise<void>>;
}
