import generate from '@babel/generator';
import * as t from '@babel/types';

export function codePreview(node: t.Node) {
  const { code } = generate(node, { compact: true, comments: false });
  if (code.length > 100) {
    return code.slice(0, 70) + ' … ' + code.slice(-30);
  }
  return code;
}
