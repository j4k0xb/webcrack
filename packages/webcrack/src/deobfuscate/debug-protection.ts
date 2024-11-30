import * as m from '@codemod/matchers';
import { ifStatement } from '@codemod/matchers';
import type { Transform } from '../ast-utils';
import { constMemberExpression, findParent, iife } from '../ast-utils';

// https://github.com/javascript-obfuscator/javascript-obfuscator/blob/d7f73935557b2cd15a2f7cd0b01017d9cddbd015/src/custom-code-helpers/debug-protection/templates/debug-protection-function-interval/DebugProtectionFunctionIntervalTemplate.ts

// https://github.com/javascript-obfuscator/javascript-obfuscator/blob/d7f73935557b2cd15a2f7cd0b01017d9cddbd015/src/custom-code-helpers/debug-protection/templates/debug-protection-function/DebugProtectionFunctionTemplate.ts

// https://github.com/javascript-obfuscator/javascript-obfuscator/blob/d7f73935557b2cd15a2f7cd0b01017d9cddbd015/src/custom-code-helpers/debug-protection/templates/debug-protection-function/DebuggerTemplate.ts

// https://github.com/javascript-obfuscator/javascript-obfuscator/blob/d7f73935557b2cd15a2f7cd0b01017d9cddbd015/src/custom-code-helpers/debug-protection/templates/debug-protection-function/DebuggerTemplateNoEval.ts

export default {
  name: 'debug-protection',
  tags: ['safe'],
  scope: true,
  visitor() {
    const ret = m.capture(m.identifier());
    const debugProtectionFunctionName = m.capture(m.anyString());
    const debuggerProtection = m.capture(m.identifier());
    const counter = m.capture(m.identifier());
    const debuggerTemplate = m.ifStatement(
      undefined,
      undefined,
      m.containerOf(
        m.or(
          m.debuggerStatement(),
          m.callExpression(
            constMemberExpression(m.anyExpression(), 'constructor'),
            [m.stringLiteral('debugger')],
          ),
        ),
      ),
    );
    // that.setInterval(debugProtectionFunctionName, 4000);
    const intervalCall = m.callExpression(
      constMemberExpression(m.anyExpression(), 'setInterval'),
      [
        m.identifier(m.fromCapture(debugProtectionFunctionName)),
        m.numericLiteral(),
      ],
    );

    // function debugProtectionFunctionName(ret) {
    const matcher = m.functionDeclaration(
      m.identifier(debugProtectionFunctionName),
      [ret],
      m.blockStatement([
        // function debuggerProtection (counter) {
        m.functionDeclaration(
          debuggerProtection,
          [counter],
          m.blockStatement([
            debuggerTemplate,
            // debuggerProtection(++counter);
            m.expressionStatement(
              m.callExpression(m.fromCapture(debuggerProtection), [
                m.updateExpression('++', m.fromCapture(counter), true),
              ]),
            ),
          ]),
        ),
        m.tryStatement(
          m.blockStatement([
            // if (ret) {
            ifStatement(
              m.fromCapture(ret),
              // return debuggerProtection;
              m.blockStatement([
                m.returnStatement(m.fromCapture(debuggerProtection)),
              ]),
              // } else { debuggerProtection(0); }
              m.blockStatement([
                m.expressionStatement(
                  m.callExpression(m.fromCapture(debuggerProtection), [
                    m.numericLiteral(0),
                  ]),
                ),
              ]),
            ),
          ]),
        ),
      ]),
    );

    return {
      FunctionDeclaration(path) {
        if (!matcher.match(path.node)) return;

        const binding = path.scope.getBinding(
          debugProtectionFunctionName.current!,
        );

        binding?.referencePaths.forEach((ref) => {
          if (intervalCall.match(ref.parent)) {
            findParent(ref, iife())?.remove();
          }
        });

        path.remove();
      },
    };
  },
} satisfies Transform;
