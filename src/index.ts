import generate from '@babel/generator';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import deobfuscator from './deobfuscator';
import { BundleInfo, getBundleInfo } from './extractor';
import { transforms } from './transforms';

const preprocessors = transforms.filter(t => t.tags.includes('preprocess'));

export default webcrack;

export function webcrack(code: string): {
  code: string;
  bundle: BundleInfo | undefined;
} {
  const ast = parse(code);

  for (const transform of preprocessors) {
    const state = { changes: 0 };
    traverse(ast, transform.visitor(), undefined, state);
    if (state.changes > 0)
      console.log(`${transform.name}: ${state.changes} changes`);
  }

  deobfuscator(ast);

  for (const transform of transforms) {
    const state = { changes: 0 };
    traverse(ast, transform.visitor(), undefined, state);
    if (state.changes > 0)
      console.log(`${transform.name}: ${state.changes} changes`);
  }

  const bundle = getBundleInfo(ast);
  console.log('Bundle:', bundle);

  const result = { code: generate(ast).code, bundle };

  if (bundle?.type === 'webpack') {
    bundle.modules.forEach(module => module.renameParams());
  }

  return result;
}
