import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { constMemberExpression, type Transform } from '../../ast-utils';

export default {
  name: 'default-parameters',
  tags: ['safe'],
  scope: true,
  visitor() {
    const defaultExpression = m.capture(m.anyExpression());
    const index = m.capture(m.numericLiteral());
    const varName = m.capture(m.identifier());
    const varId = m.capture(
      m.or(m.identifier(), m.arrayPattern(), m.objectPattern()),
    );

    // Example: arguments.length > 0 && arguments[0] !== undefined
    const argumentCheckAnd = m.logicalExpression(
      '&&',
      m.binaryExpression(
        '>',
        constMemberExpression('arguments', 'length'),
        index,
      ),
      m.binaryExpression(
        '!==',
        m.memberExpression(
          m.identifier('arguments'),
          m.fromCapture(index),
          true,
        ),
        m.identifier('undefined'),
      ),
    );
    // Example: arguments.length > 0 && arguments[0] !== undefined
    const argumentCheckOr = m.logicalExpression(
      '||',
      m.binaryExpression(
        '<=',
        constMemberExpression('arguments', 'length'),
        index,
      ),
      m.binaryExpression(
        '===',
        m.memberExpression(
          m.identifier('arguments'),
          m.fromCapture(index),
          true,
        ),
        m.identifier('undefined'),
      ),
    );
    // Example: arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    const defaultParam = m.variableDeclaration(undefined, [
      m.variableDeclarator(
        varId,
        m.conditionalExpression(
          argumentCheckAnd,
          m.memberExpression(
            m.identifier('arguments'),
            m.fromCapture(index),
            true,
          ),
          defaultExpression,
        ),
      ),
    ]);
    // Example: arguments.length > 0 && arguments[0] !== undefined && arguments[0];
    const defaultFalseParam = m.variableDeclaration(undefined, [
      m.variableDeclarator(
        varId,
        m.logicalExpression(
          '&&',
          argumentCheckAnd,
          m.memberExpression(
            m.identifier('arguments'),
            m.fromCapture(index),
            true,
          ),
        ),
      ),
    ]);
    // Example: arguments.length <= 0 || arguments[0] === undefined || arguments[0]
    const defaultTrueParam = m.variableDeclaration(undefined, [
      m.variableDeclarator(
        varId,
        m.logicalExpression(
          '||',
          argumentCheckOr,
          m.memberExpression(
            m.identifier('arguments'),
            m.fromCapture(index),
            true,
          ),
        ),
      ),
    ]);

    // Example: if (x === undefined) { x = 1; }
    const defaultParamLoose = m.ifStatement(
      m.binaryExpression('===', varName, m.identifier('undefined')),
      m.blockStatement([
        m.expressionStatement(
          m.assignmentExpression(
            '=',
            m.fromCapture(varName),
            defaultExpression,
          ),
        ),
      ]),
    );
    // Example: var y = arguments.length > 1 ? arguments[1] : undefined;
    const normalParam = m.variableDeclaration(undefined, [
      m.variableDeclarator(
        varId,
        m.conditionalExpression(
          m.binaryExpression(
            '>',
            constMemberExpression('arguments', 'length'),
            index,
          ),
          m.memberExpression(
            m.identifier('arguments'),
            m.fromCapture(index),
            true,
          ),
          m.identifier('undefined'),
        ),
      ),
    ]);

    return {
      VariableDeclaration: {
        exit(path) {
          const fn = path.parentPath.parent;
          if (!t.isFunction(fn) || path.key !== 0) return;

          const newParam = defaultParam.match(path.node)
            ? t.assignmentPattern(varId.current!, defaultExpression.current!)
            : defaultFalseParam.match(path.node)
              ? t.assignmentPattern(varId.current!, t.booleanLiteral(false))
              : defaultTrueParam.match(path.node)
                ? t.assignmentPattern(varId.current!, t.booleanLiteral(true))
                : normalParam.match(path.node)
                  ? varId.current!
                  : null;
          if (!newParam) return;

          for (let i = fn.params.length; i < index.current!.value; i++) {
            fn.params[i] = t.identifier(path.scope.generateUid('param'));
          }
          fn.params[index.current!.value] = newParam;
          path.remove();
          this.changes++;
        },
      },
      IfStatement: {
        exit(path) {
          const fn = path.parentPath.parent;
          if (!t.isFunction(fn) || path.key !== 0) return;
          if (!defaultParamLoose.match(path.node)) return;

          const binding = path.scope.getOwnBinding(varName.current!.name);
          if (!binding) return;
          const isFunctionParam =
            binding.path.listKey === 'params' && binding.path.parent === fn;
          if (!isFunctionParam) return;

          binding.path.replaceWith(
            t.assignmentPattern(varName.current!, defaultExpression.current!),
          );
          path.remove();
          this.changes++;
        },
      },
    };
  },
} satisfies Transform;
