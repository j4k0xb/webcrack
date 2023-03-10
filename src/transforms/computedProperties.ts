import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform } from '.';

export default {
  name: 'computedProperties',
  tags: ['safe', 'readability'],
  visitor: () => ({
    enter(path) {
      if (propertyMatcher.match(path.node)) {
        path.node.computed = false;
        path.node.property = t.identifier(stringMatcher.current!.value);
        this.changes++;
      } else if (keyMatcher.match(path.node)) {
        path.node.computed = false;
        path.node.key = t.identifier(stringMatcher.current!.value);
        this.changes++;
      }
    },
    noScope: true,
  }),
} satisfies Transform;

function isValidProperty(name: string) {
  return /^(?!\d)[\w$]+$/.test(name);
}

const stringMatcher = m.capture(
  m.stringLiteral(m.matcher(value => isValidProperty(value as string)))
);
const propertyMatcher = m.or(
  m.memberExpression(m.anything(), stringMatcher),
  m.optionalMemberExpression(m.anything(), stringMatcher)
);
const keyMatcher = m.or(
  m.objectProperty(stringMatcher),
  m.classProperty(stringMatcher),
  m.objectMethod(undefined, stringMatcher),
  m.classMethod(undefined, stringMatcher)
);
