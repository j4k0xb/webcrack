import { isIdentifierName } from '@babel/helper-validator-identifier';
import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform, TransformState } from '.';

export default {
  name: 'computedProperties',
  tags: ['safe'],
  visitor() {
    const stringMatcher = m.capture(
      m.stringLiteral(m.matcher(value => isIdentifierName(value as string)))
    );
    const propertyMatcher = m.or(
      m.memberExpression(m.anything(), stringMatcher, true),
      m.optionalMemberExpression(m.anything(), stringMatcher, true)
    );
    const keyMatcher = m.or(
      m.objectProperty(stringMatcher),
      m.classProperty(stringMatcher),
      m.objectMethod(undefined, stringMatcher),
      m.classMethod(undefined, stringMatcher)
    );

    return {
      // https://github.com/babel/babel/pull/14862/files
      // isn't included in the @types/babel__traverse package and can't be augmented
      ['MemberExpression|OptionalMemberExpression' as 'Expression']: {
        exit(this: TransformState, path: NodePath) {
          if (propertyMatcher.match(path.node)) {
            path.node.computed = false;
            path.node.property = t.identifier(stringMatcher.current!.value);
            this.changes++;
          }
        },
      },
      ['ObjectProperty|ClassProperty|ObjectMethod|ClassMethod' as 'Expression']: {
        exit(this: TransformState, path: NodePath) {
          if (keyMatcher.match(path.node)) {
            path.node.computed = false;
            path.node.key = t.identifier(stringMatcher.current!.value);
            this.changes++;
          }
        },
      },
      noScope: true,
    };
  },
} satisfies Transform;
