import { readFile, readdir } from 'fs/promises';
import { join } from 'node:path';
import { describe, test } from 'vitest';
import { unpack } from '../src';

const SAMPLES_DIR = join(__dirname, 'samples');

describe('samples', async () => {
  const fileNames = (await readdir(SAMPLES_DIR)).filter((name) =>
    name.endsWith('.js'),
  );
  for (let i = 0; i < 3; i++) {
    fileNames.push(...fileNames);
  }

  fileNames.forEach((fileName) => {
    test.concurrent(`unpack ${fileName}`, async ({ expect }) => {
      const code = await readFile(join(SAMPLES_DIR, fileName), 'utf8');
      const bundle = unpack(code);

      await expect(bundle).toMatchFileSnapshot(
        join(SAMPLES_DIR, fileName + '.snap'),
      );
    });
  });
});
