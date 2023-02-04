# webcrack

[![Test](https://github.com/j4k0xb/webcrack/actions/workflows/test.yml/badge.svg)](https://github.com/j4k0xb/webcrack/actions/workflows/test.yml)
[![npm](https://img.shields.io/npm/v/webcrack)](https://www.npmjs.com/package/webcrack)
[![license](https://img.shields.io/github/license/j4k0xb/webcrack)](/LICENSE)

Deobfuscate, unminify and unpack bundled javascript

## Installation

```sh
npm install -g webcrack
```

## Usage

```
Usage: webcrack [options] <file>

Arguments:
  file                           input file

Options:
  -V, --version                  output the version number
  -o, --output <path>            output directory (default: "webcrack-out")
  -m, --max-iterations <number>  maximum iterations for readability transforms (default: 5)
  -f, --force                    overwrite output directory
  -h, --help                     display help for command
```

```js
import { webcrack } from 'webcrack';

console.log((await webcrack('const a = 1+1;')).code);
```

## Deobfuscations

### [obfuscator.io](https://obfuscator.io)

- String Array
  - Rotate
  - Shuffle
  - Index Shift
  - Variable/Function Wrapper Type
  - None/Base64/RC4 encoding
- Numbers To Expressions

### General/Unminifying

```js
console['\x6c\x6f\x67']('\x61'); // console.log('a')
x && y && z(); // if (x && y) z();
x || y || z(); // if (!(x || y)) z();
!0; // true
!1; // false
![]; // false
!![]; // true
return a(), b(), c(); // a(); b(); return c();
if ((a(), b())) c(); // a(); if (b()) c();
```

## Bundle Unpacking

Extracts each module of a webpack bundle into a separate file
and allows the paths to be remapped based on AST matching.

```js
import { webcrack } from 'webcrack';
import { readFileSync } from 'fs';

const result = await webcrack(readFileSync('webpack-bundle.js', 'utf8'), {
  mappings: m => ({
    './utils/color.js': m.regExpLiteral('^#([0-9a-f]{3}){1,2}$'),
  }),
});
result.save('output-dir');
```

See [@codemod/matchers](https://github.com/codemod-js/codemod/tree/main/packages/matchers#readme) for more information about the `mappings` option.
