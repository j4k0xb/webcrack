import generate from '@babel/generator';
import { parse } from '@babel/parser';
import deobfuscator from './deobfuscator';
import { BundleInfo, getBundleInfo } from './extractor';
import { applyTransform, applyTransforms } from './transforms';

export interface WebcrackResult {
  code: string;
  bundle: BundleInfo | undefined;
}

export default webcrack;

export function webcrack(code: string): WebcrackResult {
  const ast = parse(code, { sourceType: 'unambiguous' });

  applyTransform(ast, deobfuscator);
  applyTransforms(ast, ['readability']);

  const bundle = getBundleInfo(ast);
  console.log('Bundle:', bundle);

  const result = { code: generate(ast).code, bundle };

  if (bundle?.type === 'webpack') {
    bundle.modules.forEach(module => module.renameParams());
  }

  return result;
}
