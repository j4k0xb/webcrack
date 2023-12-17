#!/usr/bin/env node

import { program } from 'commander';
import debug from 'debug';
import { existsSync, readFileSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import * as url from 'node:url';
import { webcrack } from './index.js';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const { version, description } = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf8'),
) as { version: string; description: string };

debug.enable('webcrack:*');

interface Options {
  force: boolean;
  output?: string;
  mangle?: boolean;
}

async function readStdin() {
  let data = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

program
  .version(version)
  .description(description)
  .option('-o, --output <path>', 'output directory for bundled files')
  .option('-f, --force', 'overwrite output directory')
  .option('-m, --mangle', 'mangle variable names')
  .argument('[file]', 'input file, defaults to stdin')
  .action(async (input: string | undefined) => {
    const { output, force, mangle } = program.opts<Options>();
    const code = await (input ? readFile(input, 'utf8') : readStdin());

    if (output) {
      if (force || !existsSync(output)) {
        await rm(output, { recursive: true, force: true });
      } else {
        program.error('output directory already exists');
      }
    }

    const result = await webcrack(code, { mangle });

    if (output) {
      await result.save(output);
    } else {
      console.log(result.code);
      if (result.bundle) {
        debug('webcrack:unpack')(
          `${result.bundle.modules.size} modules are not displayed in the terminal. Use the --output option to save them`,
        );
      }
    }
  })
  .parse();
