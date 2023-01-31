import generate from '@babel/generator';
import { parse } from '@babel/parser';
import traverse, { Node } from '@babel/traverse';
import deobfuscator from './deobfuscator';
import { BundleInfo, getBundleInfo } from './extractor';
import { Tag, Transform, transforms } from './transforms';

export interface WebcrackResult {
  code: string;
  bundle: BundleInfo | undefined;
}

export default webcrack;

export function webcrack(code: string): WebcrackResult {
  const ast = parse(code);

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

export function applyTransforms(ast: Node, tags: Tag[]) {
  transforms
    .filter(t => tags.some(x => t.tags.includes(x)))
    .forEach(transform => {
      applyTransform(ast, transform);
    });
}

export function applyTransform<TTransform extends Transform>(
  ast: Node,
  transform: TTransform,
  options?: TTransform extends Transform<infer TOptions> ? TOptions : never
) {
  const start = performance.now();
  console.log(`${transform.name}: started`);

  transform.preTransforms?.forEach(preTransform => {
    applyTransform(ast, preTransform);
  });

  const state = { changes: 0 };
  transform.run?.(ast, state);
  if (transform.visitor)
    traverse(ast, transform.visitor(options), undefined, state);

  transform.postTransforms?.forEach(postTransform => {
    applyTransform(ast, postTransform);
  });

  console.log(
    `${transform.name}: finished in ${Math.floor(
      performance.now() - start
    )} ms with ${state.changes} changes`
  );
}
