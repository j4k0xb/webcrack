import * as t from '@babel/types';

export function getPropName(node: t.Node): string | undefined {
  if (t.isIdentifier(node)) {
    return node.name;
  }
  if (t.isStringLiteral(node)) {
    return node.value;
  }
  if (t.isNumericLiteral(node)) {
    return node.value.toString();
  }
}

const INVALID_NUL_ESCAPE = /(?<!\\)((?:\\\\)*)\\0(?=\d)/g;

export function escapeTemplateElement(str: string): string {
  return (
    str
      .replaceAll('\\', '\\\\')
      .replaceAll('`', '\\`')
      .replaceAll('$', '\\$')
      .replaceAll('\0', '\\0')
      .replaceAll('\b', '\\b')
      .replaceAll('\f', '\\f')
      // .replaceAll('\n', '\\n') // not escaped because multiline strings are preferred
      .replaceAll('\r', '\\r')
      .replaceAll('\t', '\\t')
      .replaceAll('\v', '\\v')
      .replace(INVALID_NUL_ESCAPE, '$1\\x00')
  );
}

export function concatTemplateElementRaw(
  leftRaw: string,
  rightRaw: string,
): string {
  return (leftRaw + rightRaw).replace(INVALID_NUL_ESCAPE, '$1\\x00');
}
