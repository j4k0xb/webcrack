import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import assert from 'assert';
import { Module } from './module';

export function getModules(ast: t.File): {
  entryId: number;
  modules: Map<number, Module>;
} {
  const entryId = findEntryId(ast);
  const modules = extractModules(ast, entryId);

  return { entryId, modules };
}

/**
 * Finds the first assignment expression in prelude, e.g. `i((i.s = 161));`
 */
function findEntryId(ast: t.File) {
  let entryId: number | undefined;

  traverse(ast, {
    AssignmentExpression(path) {
      const entryIdMatcher = m.capture(m.numericLiteral());
      const matcher = m.assignmentExpression(
        '=',
        m.memberExpression(),
        entryIdMatcher
      );
      if (matcher.match(path.node)) {
        entryId = entryIdMatcher.current?.value;
        path.stop();
      }
    },
  });

  assert(entryId !== undefined, 'No entry id found');
  return entryId;
}

function extractModules(ast: t.File, entryId: number): Map<number, Module> {
  const modules = new Map<number, Module>();

  traverse(ast, {
    CallExpression(path) {
      // [, factory1, factory2, ...] can contain holes
      const factoriesMatcher = m.arrayExpression(
        m.anyList(m.zeroOrMore(), m.functionExpression())
      );

      // (function(e) {....})([, factory1, factory2, ...])
      const matcher = m.callExpression(m.functionExpression(), [
        factoriesMatcher,
      ]);

      if (!matcher.match(path.node)) return;

      const factoriesPath = path.get(
        'arguments'
      )[0] as NodePath<t.ArrayExpression>;

      factoriesPath.get('elements').forEach((factoryPath, index) => {
        if (factoryPath.isFunctionExpression()) {
          modules.set(index, new Module(index, factoryPath, index === entryId));
        }
      });

      path.stop();
    },
  });

  return modules;
}
