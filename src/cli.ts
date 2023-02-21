#!/usr/bin/env node

import { InvalidArgumentError, program } from 'commander';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { webcrack } from '.';
import { defaultOptions } from './index';

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

    if (force || !existsSync(output)) {
      rmSync(output, { recursive: true, force: true });
    } else {
      program.error('output directory already exists');
    }

    (await webcrack(readFileSync(input, 'utf8'), { maxIterations })).save(
      output
    );
  })
  .parse();

function validatePositiveNumber(value: string) {
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) {
    throw new InvalidArgumentError('Not a positive number');
  }
  return n;
}
