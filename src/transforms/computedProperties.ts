import { isIdentifierName } from '@babel/helper-validator-identifier';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform } from '.';

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
      'MemberExpression|OptionalMemberExpression': {
        exit(path) {
          if (propertyMatcher.match(path.node)) {
            path.node.computed = false;
            path.node.property = t.identifier(stringMatcher.current!.value);
            this.changes++;
          }
        },
      },
      'ObjectProperty|ClassProperty|ObjectMethod|ClassMethod': {
        exit(path) {
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
