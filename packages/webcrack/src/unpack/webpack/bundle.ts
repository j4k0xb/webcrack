import type { NodePath } from '@babel/traverse';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Bundle } from '../bundle';
import { relativePath } from '../path';
import { convertESM } from './esm';
import { convertDefaultRequire } from './getDefaultExport';
import type { WebpackModule } from './module';
import { inlineVarInjections } from './varInjection';

export class WebpackBundle extends Bundle {
  constructor(entryId: string, modules: Map<string, WebpackModule>) {
    super('webpack', entryId, modules);
  }

  /**
   * Undoes some of the transformations that Webpack injected into the modules.
   */
  applyTransforms(): void {
    this.modules.forEach(inlineVarInjections);
    this.modules.forEach(convertESM);
    convertDefaultRequire(this);
    this.replaceRequirePaths();
  }

  /**
   * Replaces `require(id)` calls with `require("./relative/path.js")` calls.
   */
  private replaceRequirePaths() {
    const requireId = m.capture(m.or(m.numericLiteral(), m.stringLiteral()));
    const requireMatcher = m.or(
      m.callExpression(m.identifier('require'), [requireId]),
    );
    const importId = m.capture(m.stringLiteral());
    const importMatcher = m.importDeclaration(m.anything(), importId);

    this.modules.forEach((module) => {
      traverse(module.ast, {
        'CallExpression|ImportDeclaration': (path) => {
          let moduleId: string;
          let arg: NodePath;

          if (requireMatcher.match(path.node)) {
            moduleId = requireId.current!.value.toString();
            [arg] = path.get('arguments') as NodePath<t.Identifier>[];
          } else if (importMatcher.match(path.node)) {
            moduleId = importId.current!.value;
            arg = path.get('source') as NodePath;
          } else {
            return;
          }

          const requiredModule = this.modules.get(moduleId);
          arg.replaceWith(
            t.stringLiteral(
              relativePath(
                module.path,
                requiredModule?.path ?? `./${moduleId}.js`,
              ),
            ),
          );
          // For example if its stored in another chunk
          if (!requiredModule) {
            arg.addComment('leading', 'webcrack:missing');
          }
        },
        noScope: true,
      });
    });
  }
}
