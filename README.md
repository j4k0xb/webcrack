[![Test](https://github.com/j4k0xb/webcrack/actions/workflows/ci.yml/badge.svg)](https://github.com/j4k0xb/webcrack/actions/workflows/test.yml)
[![npm](https://img.shields.io/npm/v/webcrack)](https://www.npmjs.com/package/webcrack)
[![license](https://img.shields.io/github/license/j4k0xb/webcrack)](https://github.com/j4k0xb/webcrack/blob/master/LICENSE)
[![Netlify Status](https://api.netlify.com/api/v1/badges/ba64bf80-7053-4ed8-a282-d3762742c0dd/deploy-status)](https://app.netlify.com/sites/webcrack/deploys)

<p align="center">
  <img src="https://user-images.githubusercontent.com/55899582/231488871-e83fb827-1b25-4ec9-a326-b14244677e87.png" width="200">
</p>

<h1 align="center">webcrack</h1>

webcrack is a tool for reverse engineering javascript.
It can deobfuscate [obfuscator.io](https://github.com/javascript-obfuscator/javascript-obfuscator), unminify,
transpile, and unpack [webpack](https://webpack.js.org/)/[browserify](https://browserify.org/),
to resemble the original source code as much as possible.

Try it in the [online playground](https://webcrack.netlify.app/) or view the [documentation](https://webcrack.netlify.app/docs).

- 🚀 **Performance** - Various optimizations to make it fast
- 🛡️ **Safety** - Considers variable references and scope
- 🔬 **Auto-detection** - Finds code patterns without needing a config
- ✍🏻 **Readability** - Removes obfuscator/bundler artifacts
- ⌨️ **TypeScript** - All code is written in TypeScript
- 🧪 **Tests** - To make sure nothing breaks

## Command Line Interface

```bash
npm install -g webcrack
```

Examples:

```bash
webcrack input.js
webcrack input.js > output.js
webcrack bundle.js -o output-dir
```

## API

```bash
npm install webcrack
```

Examples:

```js
import fs from 'fs';
import { webcrack } from 'webcrack';

const input = fs.readFileSync('bundle.js', 'utf8');

const result = await webcrack(input);
console.log(result.code);
console.log(result.bundle);
await result.save('output-dir');
```
