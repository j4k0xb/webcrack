[![Test](https://github.com/j4k0xb/webcrack/actions/workflows/ci.yml/badge.svg)](https://github.com/j4k0xb/webcrack/actions/workflows/ci.yml)
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

## Requirements

Node.js 22, 24, or 26.

> [!NOTE]
> webcrack depends on [`isolated-vm`](https://github.com/laverdet/isolated-vm), which [does not recommend using odd-numbered Node.js releases](https://github.com/laverdet/isolated-vm#security) because they frequently break ABI/API compatibility with V8.

## Command Line Interface

```bash
npm install -g webcrack@latest
```

Examples:

```bash
webcrack input.js
webcrack input.js > output.js
webcrack bundle.js -o output-dir
```

[CLI Reference](https://webcrack.netlify.app/docs/guide/cli.html)

## API

```bash
npm install webcrack@latest
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

[API Reference](https://webcrack.netlify.app/docs/guide/api.html)

## Donations

If this project has helped you, consider donating to support its development:

- [GitHub Sponsors](https://github.com/sponsors/j4k0xb)
- Ethereum: `0xb3eFD474Dd8aFA715F563EfA322F6ae9Ae9DfCeA`
- Bitcoin: `bc1qc3u7ef2rue75f6t8x290r0qk0u84f0ln8ndjun`
- Solana: `6w9SFAYBxCKdtuj8DEAV9YT5zP68g4PyEkb21AmdxcBq`
- Monero: `87iYegrerGf1DUsTvUnbsv8gjTMJmzS3idRxHWkCy4iz1Xz5CUnDXy3VkTToSg32LUW3cwNrgLKd1TXRJqJY7MnvVR9yidm`
