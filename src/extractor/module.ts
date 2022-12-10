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

    // TODO: make sure the names aren't already used
    this.ast.node.params.forEach((param, index) => {
      this.ast.scope.rename(
        (param as t.Identifier).name,
        FACTORY_PARAM_NAMES[index]
      );
    });
  }
}
