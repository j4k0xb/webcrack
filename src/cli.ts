#!/usr/bin/env node

import { program } from 'commander';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { webcrack } from '.';

const { version } = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf8')
);

program
  .version(version)
  .option('-o, --output <path>', 'output directory', 'webcrack-out')
  .option('-f, --force', 'overwrite output directory')
  .argument('<file>', 'input file')
  .action(input => {
    const { output, force } = program.opts();

    if (force || !existsSync(output)) {
      rmSync(output, { recursive: true, force: true });
    } else {
      program.error('output directory already exists');
    }

    webcrack(readFileSync(input, 'utf8')).save(output);
  })
  .parse();
