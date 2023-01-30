#!/usr/bin/env node

import { program } from 'commander';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { webcrack } from '.';

const { version } = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf8')
);

program
  .version(version)
  .option('-o, --output <path>', 'output directory')
  .argument('<file>', 'input file')
  .action(input => {
    const { output = 'webcrack-out' } = program.opts();
    if (existsSync(output)) program.error('output directory already exists');
    mkdirSync(output, { recursive: true });

    const script = readFileSync(input, 'utf8');

    const result = webcrack(script);
    writeFileSync(join(output, basename(input)), result.code, 'utf8');

    if (result.bundle) {
      writeFileSync(
        join(output, 'bundle.json'),
        JSON.stringify(
          { type: result.bundle.type, entryId: result.bundle.entryId },
          null,
          2
        ),
        'utf8'
      );

      mkdirSync(join(output, 'modules'));
      result.bundle.modules.forEach(module => {
        writeFileSync(
          join(output, 'modules', `${module.id}.js`),
          module.getCode(),
          'utf8'
        );
      });
    }
  })
  .parse();
