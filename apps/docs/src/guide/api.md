# API Examples

Installation:

::: code-group

```bash [npm]
npm install webcrack
```

```bash [yarn]
yarn add webcrack
```

```bash [pnpm]
pnpm add webcrack --allow-build=isolated-vm
```

## Basic Usage

:::

:::info
All examples are shown with ESM syntax.
For CommonJS, use the following instead:

```js
const { webcrack } = require('webcrack');

webcrack('const a = 1+1;').then((result) => {
  console.log(result.code); // 'const a = 2;'
});
```

:::

```js
import { webcrack } from 'webcrack';

const result = await webcrack('const a = 1+1;');
console.log(result.code); // 'const a = 2;'
```

Save the deobfuscated code and the unpacked bundle to the given directory:

```js
import fs from 'fs';
import { webcrack } from 'webcrack';

const code = fs.readFileSync('bundle.js', 'utf8');
const result = await webcrack(code);
await result.save('output-dir');
```

## Get Bundle Info

```js
const { bundle } = await webcrack(code);
bundle.type; // 'webpack' or 'browserify'
bundle.entryId; // '0'
bundle.modules; // Map(10) { '0' => Module { id: '0', ... }, 1 => ... }

const entry = bundle.modules.get(bundle.entryId);
entry.id; // '0'
entry.path; // './index.js'
entry.code; // 'const a = require("./1.js");'
```

## Options

The default options are:

```js
await webcrack(code, {
  jsx: true, // Decompile react components to JSX
  unpack: true, // Extract modules from the bundle
  unminify: true, // Unminify the code
  deobfuscate: true, // Deobfuscate the code
  mangle: false, // Mangle variable names
  plugins: {}, // Explained below
  sandbox, // Explained below
});
```

Only mangle variable names that match a filter:

```js
await webcrack(code, {
  mangle: (id) => id.startsWith('_0x'),
});
```

Other options include:

- `mappings`: The `mappings` option takes a function that receives an instance of [@codemod/matchers](https://github.com/codemod-js/codemod/tree/main/packages/matchers#readme), and returns an object that maps any matching nodes, to the path specified in the object key.

## Browser Usage & Sandbox

The `sandbox` option has to be passed when trying to deobfuscate string arrays in a browser.
In future versions, this should hopefully not be necessary anymore.

It is an (optionally async) function that takes a `code` parameter and returns the evaluated value.

::: danger Security warning
Simplest possible implementation, avoid using due to potentially executing malicious code
:::

```js
const result = await webcrack('function _0x317a(){....', { sandbox: eval });
```

More secure version with [sandybox](https://github.com/trentmwillis/sandybox) and CSP:

```js
const sandbox = await Sandybox.create();
const iframe = document.querySelector('.sandybox');
iframe?.contentDocument?.head.insertAdjacentHTML(
  'afterbegin',
  `<meta http-equiv="Content-Security-Policy" content="default-src 'none';">`,
);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function evalCode(code) {
  const fn = await sandbox.addFunction(`() => ${code}`);
  return Promise.race([
    fn(),
    sleep(10_000).then(() => Promise.reject(new Error('Sandbox timeout'))),
  ]).finally(() => sandbox.removeFunction(fn));
}

const result = await webcrack('function _0x317a(){....', { sandbox: evalCode });
```

## Customize Paths

Useful for reverse-engineering and tracking changes across multiple versions of a bundle.

The `mappings` option takes a function that receives an instance of [@codemod/matchers](https://github.com/codemod-js/codemod/tree/main/packages/matchers#readme), and returns an object that maps any matching nodes, to the path specified in the object key.

If a matching node in the AST of a module is found, it will be renamed to the given path.

- Path starting with `./` are relative to the output directory.
- Otherwise, the path is treated as a node module.

```js
const result = await webcrack(code, {
  mappings: (m) => ({
    './utils/color.js': m.regExpLiteral('^#([0-9a-f]{3}){1,2}$'),
    'lodash/index.js': m.memberExpression(
      m.identifier('lodash'),
      m.identifier('map'),
    ),
  }),
});
await result.save('output-dir');
```

New folder structure:

```txt
├── index.js
├── utils
│   └── color.js
└── node_modules
    └── lodash
        └── index.js
```

See [@codemod/matchers](https://github.com/codemod-js/codemod/tree/main/packages/matchers#readme) for more information about matchers.

## Plugins

::: warning Experimental
This API is only available in the beta version and might change in future versions.
:::

Webcrack's processing pipeline consists of six key stages:

1. **Parse**: The input code is parsed into an Abstract Syntax Tree (AST).
2. **Prepare**: Performs basic normalization, such as adding block statements.
3. **[Deobfuscate](../concepts/deobfuscate.md)**
4. **[Transpile](../concepts/transpile.md)** and **[Unminify](../concepts/unminify.md)**
5. **[JSX](../concepts/jsx.md)** and **[Unpack](../concepts/unpack.md)**
6. **Generate**: Converts the modified AST back into executable code.

You can extend or modify webcrack's behavior by hooking into its pipeline stages using plugins. Plugins allow you to manipulate the AST at specific stages of the pipeline.

### Supported Stages

The `plugins` option lets you specify an array of plugins for the following stages:

- `afterParse`
- `afterPrepare`
- `afterDeobfuscate`
- `afterUnminify`
- `afterUnpack`

Plugins are executed sequentially in the order they are defined for each stage.

### Writing Plugins

Refer to the [Babel Plugin Handbook](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md#writing-your-first-babel-plugin) for a detailed guide on writing plugins.

Webcrack's plugin API is similar to Babel's but only the following utility libraries are provided to the plugin function:

- [`parse`](https://babeljs.io/docs/babel-parser)
- [`types`](https://babeljs.io/docs/babel-types)
- [`traverse`](https://babeljs.io/docs/babel-traverse)
- [`template`](https://babeljs.io/docs/babel-template)
- [`matchers`](https://github.com/codemod-js/codemod/tree/main/packages/matchers)

### Example Plugin

```js
import { webcrack } from 'webcrack';

function myPlugin({ types: t }) {
  return {
    pre() {
      console.log('Running before traversal');
    },
    visitor: {
      NumericLiteral(path) {
        console.log('Found a number:', path.node.value);
        path.replaceWith(t.stringLiteral('x'));
      },
    },
    post() {
      console.log('Running after traversal');
    },
  };
}

const result = await webcrack('1 + 1', {
  plugins: {
    afterParse: [myPlugin],
  },
});
console.log(result.code); // '"xx"'
```

### Using Babel plugins

It should be compatible with most Babel plugins as long as they only access the limited API specified above.

```js
import removeConsole from 'babel-plugin-transform-remove-console';
import { webcrack } from 'webcrack';

const result = await webcrack('consol.log(a), b()', {
  plugins: {
    afterUnminify: [removeConsole],
  },
});
console.log(result.code); // 'b();'
```
