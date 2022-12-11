import generate from '@babel/generator';
import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';

export class Module {
  constructor(
    public id: number,
    public ast: NodePath<t.FunctionExpression>,
    public isEntry: boolean
  ) {}

  getCode() {
    return generate(t.program(this.ast.node.body.body)).code;
  }

  /**
   * `function (e, t, i) {...}` -> `function (module, exports, require) {...}`
   */
  renameParams() {
    const FACTORY_PARAM_NAMES = ['module', 'exports', 'require'];

    // Rename existing bindings with this name so there's no risk of conflicts
    this.ast.traverse({
      Identifier(path) {
        if (FACTORY_PARAM_NAMES.includes(path.node.name)) {
          path.scope.rename(path.node.name);
        }
      },
    });

    this.ast.node.params.forEach((param, index) => {
      this.ast.scope.rename(
        (param as t.Identifier).name,
        FACTORY_PARAM_NAMES[index]
      );
    });
  }
}
