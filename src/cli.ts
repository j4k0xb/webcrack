#!/usr/bin/env node

import { InvalidArgumentError, program } from 'commander';
import { existsSync, readFileSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import * as url from 'url';
import { webcrack } from '.';
import { defaultOptions } from './index';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const { version, description } = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf8')
);

program
  .version(version)
  .description(description)
  .option('-o, --output <path>', 'output directory', 'webcrack-out')
  .option(
    '-m, --max-iterations <number>',
    'maximum iterations for readability transforms',
    validatePositiveNumber,
    defaultOptions.maxIterations
  )
  .option('-f, --force', 'overwrite output directory')
  .argument('<file>', 'input file')
  .action(async input => {
    const { output, maxIterations, force } = program.opts();
    const code = await readFile(input, 'utf8');

    if (force || !existsSync(output)) {
      await rm(output, { recursive: true, force: true });
    } else {
      program.error('output directory already exists');
    }

    (await webcrack(code, { maxIterations })).save(output);
  })
  .parse();

function validatePositiveNumber(value: string) {
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) {
    throw new InvalidArgumentError('Not a positive number');
  }
  return n;
}
