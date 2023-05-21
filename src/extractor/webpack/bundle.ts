import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { relativePath } from '../../utils/path';
import { Bundle } from '../bundle';
import { convertESM } from './esm';
import { convertDefaultRequire } from './getDefaultExport';
import { WebpackModule } from './module';
import { inlineVarInjections } from './varInjection';

export class WebpackBundle extends Bundle {
  constructor(entryId: number, modules: Map<number, WebpackModule>) {
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
    const requireId = m.capture(m.numericLiteral());
    const requireMatcher = m.or(
      m.callExpression(m.identifier('require'), [requireId])
    );
    const importId = m.capture(m.stringLiteral());
    const importMatcher = m.importDeclaration(m.anything(), importId);

    this.modules.forEach(module => {
      traverse(module.ast, {
        enter: path => {
          if (requireMatcher.match(path.node)) {
            const requiredModule = this.modules.get(requireId.current!.value);
            if (requiredModule) {
              const [arg] = path.get('arguments') as NodePath<t.Identifier>[];
              arg.replaceWith(
                t.stringLiteral(relativePath(module.path, requiredModule.path))
              );
            }
          } else if (importMatcher.match(path.node)) {
            const requiredModule = this.modules.get(
              Number(importId.current!.value)
            );
            if (requiredModule) {
              const arg = path.get('source') as NodePath;
              arg.replaceWith(
                t.stringLiteral(relativePath(module.path, requiredModule.path))
              );
            }
          }
        },
        noScope: true,
      });
    });
  }
}
