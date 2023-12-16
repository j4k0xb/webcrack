import { readFile, readdir } from 'fs/promises';
import { join } from 'node:path';
import { describe, test } from 'vitest';
import { webcrack } from '../../index';

const SAMPLES_DIR = join(__dirname, 'samples');

describe('samples', async () => {
  const fileNames = (await readdir(SAMPLES_DIR)).filter((name) =>
    name.endsWith('.js'),
  );

  fileNames.forEach((fileName) => {
    test.concurrent(`deobfuscate ${fileName}`, async ({ expect }) => {
      const code = await readFile(join(SAMPLES_DIR, fileName), 'utf8');
      const result = await webcrack(code);

      await expect(result.code).toMatchFileSnapshot(
        join(SAMPLES_DIR, fileName + '.snap'),
      );
    });
  });
});
