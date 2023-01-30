#!/usr/bin/env node
import generate from '@babel/generator';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import assert from 'assert';
import { readFileSync, writeFileSync } from 'fs';
import deobfuscator from './deobfuscator';
import { getBundleInfo } from './extractor';
import { transforms } from './transforms';

const inputPath = process.argv[2];
assert(inputPath, 'Please provide an input file');

const script = readFileSync(inputPath, 'utf8');
const ast = parse(script);

const preprocessors = transforms.filter(t => t.tags.includes('preprocess'));

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
const generated = generate(ast).code;
writeFileSync('deobf.js', generated);

const bundle = getBundleInfo(ast);
console.log('Bundle:', bundle);
if (bundle?.type === 'webpack') {
  for (const module of bundle.modules.values()) {
    module.renameParams();
    writeFileSync(`extracted/${module.id}.js`, module.getCode());
  }
}
