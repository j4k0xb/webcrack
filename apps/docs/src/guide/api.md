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
  sandbox, // Explained below
});
```

Only mangle variable names that match a filter:

```js
await webcrack(code, {
  mangle: (id) => id.startsWith('_0x'),
});
```

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

There are 5 stages you can hook into to manipulate the AST, which run in this order:

- parse
- prepare
- deobfuscate
- unminify
- unpack

See the [babel plugin handbook](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md#writing-your-first-babel-plugin) for more information about writing plugins.
This API is pretty similar, but there are some differences:

- The required `runAfter` property specifies the stage
- Only `visitor`, `pre` and `post` are supported
- [parse](https://babeljs.io/docs/babel-parser),
  [types](https://babeljs.io/docs/babel-types),
  [traverse](https://babeljs.io/docs/babel-traverse),
  [template](https://babeljs.io/docs/babel-template) and
  [matchers](https://github.com/codemod-js/codemod/tree/main/packages/matchers) are passed to the plugin function

### Example

```js
import { webcrack } from 'webcrack';

function myPlugin({ types: t, matchers: m }) {
  return {
    runAfter: 'parse', // change it to 'unminify' and see what happens
    pre(state) {
      this.cache = new Set();
    },
    visitor: {
      StringLiteral(path) {
        this.cache.add(path.node.value);
      },
    },
    post(state) {
      console.log(this.cache); // Set(2) {'a', 'b'}
    },
  };
}

const result = await webcrack('"a" + "b"', { plugins: [myPlugin] });
```

### Using Babel plugins

It should be compatible with most Babel plugins as long as they only access the limited API specified above.
They have to be wrapped to set the `runAfter` property.

```js
import removeConsole from 'babel-plugin-transform-remove-console';

function removeConsoleWrapper(babel) {
  return {
    runAfter: 'deobfuscate',
    ...removeConsole(babel),
  };
}
```
