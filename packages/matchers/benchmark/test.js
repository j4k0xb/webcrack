import * as t from '@babel/types';
import * as cm from '@codemod/matchers';
import * as b from 'benny';
import * as m from '../src/index';

const webcrackMatcher = m.compile(
  m.binaryExpression(
    m.any,
    m.numericLiteral(m.capture('left')),
    m.binaryExpression(
      m.any,
      m.numericLiteral(m.capture('middle')),
      m.numericLiteral(m.capture('right')),
    ),
  ),
);
console.log(webcrackMatcher.toString());

const left = cm.capture(cm.anyNumber());
const middle = cm.capture(cm.anyNumber());
const right = cm.capture(cm.anyNumber());
const codemodMatcher = cm.binaryExpression(
  cm.anything(),
  cm.numericLiteral(left),
  cm.binaryExpression(
    cm.anything(),
    cm.numericLiteral(middle),
    cm.numericLiteral(right),
  ),
);

const binExp = t.binaryExpression(
  '+',
  t.numericLiteral(1),
  t.binaryExpression('+', t.numericLiteral(2), t.numericLiteral(3)),
);
const binExp2 = t.binaryExpression(
  '+',
  t.numericLiteral(1),
  t.binaryExpression('+', t.stringLiteral('x'), t.numericLiteral(3)),
);

b.suite(
  'Matcher Performance',

  b.add('@webcrack/matchers', () => {
    const captures = webcrackMatcher(binExp);
    if (captures) {
      captures.left === captures.right;
    }
    const captures2 = webcrackMatcher(binExp2);
    if (captures2) {
      captures2.left === captures2.right;
    }
  }),
  b.add('@codemod/matchers', () => {
    if (codemodMatcher.match(binExp)) {
      left.current === right.current;
    }
    if (codemodMatcher.match(binExp2)) {
      left.current === right.current;
    }
  }),
  b.cycle(),
  b.complete(),
);
