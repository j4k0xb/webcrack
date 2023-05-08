[![Test](https://github.com/j4k0xb/webcrack/actions/workflows/test.yml/badge.svg)](https://github.com/j4k0xb/webcrack/actions/workflows/test.yml)
[![npm](https://img.shields.io/npm/v/webcrack)](https://www.npmjs.com/package/webcrack)
[![license](https://img.shields.io/github/license/j4k0xb/webcrack)](https://github.com/j4k0xb/webcrack/blob/master/LICENSE)
[![Netlify Status](https://api.netlify.com/api/v1/badges/ba64bf80-7053-4ed8-a282-d3762742c0dd/deploy-status)](https://app.netlify.com/sites/webcrack/deploys)

<p align="center">
  <img src="https://user-images.githubusercontent.com/55899582/231488871-e83fb827-1b25-4ec9-a326-b14244677e87.png" width="200">
</p>

<h1 align="center">webcrack</h1>

This projects aims to combine the best features of other javascript deobfuscators and unpackers into one tool, while improving on them in the following ways:

- 🚀 **Performance** - Especially for large files
- 🛡️ **Safety** - Considers variable references and scope
- 🔬 **Auto-detection** - Finds code patterns without needing a config
- ✍🏻 **Readability** - Removes obfuscator/bundler artifacts
- ⌨️ **TypeScript** - All code is written in TypeScript
- 🧪 **Tests** - To make sure nothing breaks

## Installation

```sh
npm install -g webcrack
```

## Usage

Online version: [webcrack.netlify.app](https://webcrack.netlify.app/)

```text
Usage: webcrack [options] <file>

Deobfuscate, unminify and unpack bundled javascript

Arguments:
  file                           input file

Options:
  -V, --version                  output the version number
  -o, --output <path>            output directory (default: "webcrack-out")
  -f, --force                    overwrite output directory
  -h, --help                     display help for command
```

```js
import { webcrack } from 'webcrack';

console.log((await webcrack('const a = 1+1;')).code);
```

## Deobfuscation

### [obfuscator.io](https://obfuscator.io)

Can be used to deobfuscate code obfuscated with the following options:

- String Array
  - Rotate
  - Shuffle
  - Index Shift
  - Calls Transform
  - Variable/Function Wrapper Type
  - None/Base64/RC4 Encoding
  - Split Strings
- Other Transformations
  - Compact
  - Simplify
  - Numbers To Expressions
  - Control Flow Flattening
  - Dead Code Injection
- Disable Console Output
- Self Defending
- Debug Protection
- Domain Lock

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
void 0; // undefined
'red' === color; // color === 'red'
```

## JSX Decompiling

Convert react components to JSX.

```js
React.createElement(
  'div',
  null,
  React.createElement('span', null, 'Hello ', name)
);
```

->

```jsx
<div>
  <span>Hello {name}</span>
</div>
```

## Bundle Unpacking

Currently supported bundlers: **webpack v4, v5**

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
