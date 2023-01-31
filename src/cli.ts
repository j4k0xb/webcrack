#!/usr/bin/env node

import { program } from 'commander';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { webcrack } from '.';
import { BundleInfo } from './extractor';

const { version } = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf8')
);

program
  .version(version)
  .option('-o, --output <path>', 'output directory')
  .option('-f, --force', 'overwrite output directory')
  .argument('<file>', 'input file')
  .action(input => {
    const { output = 'webcrack-out', force } = program.opts();

    if (force || !existsSync(output)) {
      rmSync(output, { recursive: true });
      mkdirSync(output, { recursive: true });
    } else {
      program.error('output directory already exists');
    }

    const result = webcrack(readFileSync(input, 'utf8'));
    writeFileSync(join(output, 'deobfuscated.js'), result.code, 'utf8');

    if (result.bundle) {
      saveModules(output, result.bundle);
    }
  })
  .parse();

function saveModules(output: string, bundle: BundleInfo) {
  writeFileSync(
    join(output, 'bundle.json'),
    JSON.stringify(bundle, null, 2),
    'utf8'
  );

  mkdirSync(join(output, 'modules'), { recursive: true });

  bundle.modules.forEach(module => {
    writeFileSync(
      join(output, 'modules', `${module.id}.js`),
      module.getCode(),
      'utf8'
    );
  });
}
