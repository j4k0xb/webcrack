# webcrack

[![Test](https://github.com/j4k0xb/webcrack/actions/workflows/test.yml/badge.svg)](https://github.com/j4k0xb/webcrack/actions/workflows/test.yml)
[![npm](https://img.shields.io/npm/v/webcrack)](https://www.npmjs.com/package/webcrack)
[![license](https://img.shields.io/github/license/j4k0xb/webcrack)](https://github.com/j4k0xb/webcrack/blob/master/LICENSE)

This projects aims to combine the best features of other javascript deobfuscators and unpackers into one tool, while improving on them in the following ways:

- ๐ **Performance** - Especially for large files
- ๐ก๏ธ **Safety** - Considers variable references and scope
- ๐ฌ **Auto-detection** - Finds code patterns without needing a config
- โ๐ป **Readability** - Removes obfuscator/bundler artifacts
- โจ๏ธ **TypeScript** - All code is written in TypeScript
- ๐งช **Tests** - To make sure nothing breaks

## Installation

```sh
npm install -g webcrack
```

## Usage

```text
Usage: webcrack [options] <file>

Deobfuscate, unminify and unpack bundled javascript

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
- Split Strings

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

Currently supported bundlers: **webpack v4**

- Each module of a bundle gets extracted into a separate file
- Webpack's runtime code gets removed
- Modules can get converted to ESM
- You can modify the unpacked modules and bundle them again: `npx webpack-cli ./webcrack-out`

### Path-Mapping

Useful for reverse-engineering and tracking changes across multiple versions of a bundle.

The values are matchers. If they match a node in the AST, the module's path is changed to the corresponding key.

Example:

```js
import { webcrack } from 'webcrack';
import { readFileSync } from 'fs';

const result = await webcrack(readFileSync('webpack-bundle.js', 'utf8'), {
  mappings: m => ({
    'utils/color.js': m.regExpLiteral('^#([0-9a-f]{3}){1,2}$'),
    'node_modules/lodash/index.js': m.memberExpression(
      m.identifier('lodash'),
      m.identifier('map')
    ),
  }),
});
result.save('output-dir');
```

See [@codemod/matchers](https://github.com/codemod-js/codemod/tree/main/packages/matchers#readme) for more information about matchers.
