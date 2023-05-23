#!/usr/bin/env node

import { program } from 'commander';
import { existsSync, readFileSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import * as url from 'url';
import { webcrack } from './index.js';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const { version, description } = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf8')
) as { version: string; description: string };

interface Options {
  force: boolean;
  output: string;
}

program
  .version(version)
  .description(description)
  .option('-o, --output <path>', 'output directory', 'webcrack-out')
  .option('-f, --force', 'overwrite output directory')
  .argument('<file>', 'input file')
  .action(async (input: string) => {
    const { output, force } = program.opts<Options>();
    const code = await readFile(input, 'utf8');

    if (force || !existsSync(output)) {
      await rm(output, { recursive: true, force: true });
    } else {
      program.error('output directory already exists');
    }

    const result = await webcrack(code);
    await result.save(output);
  })
  .parse();
