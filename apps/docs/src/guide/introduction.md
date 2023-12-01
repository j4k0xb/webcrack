# Introduction

webcrack is a tool for reverse engineering javascript.
It can deobfuscate [obfuscator.io](https://github.com/javascript-obfuscator/javascript-obfuscator), unminify,
and unpack [webpack](https://webpack.js.org/)/[browserify](https://browserify.org/),
to resemble the original source code as much as possible.

- 🚀 **Performance** - 500% faster than [synchrony](https://github.com/relative/synchrony)
- 🛡️ **Safety** - Considers variable references and scope
- 🔬 **Auto-detection** - Finds code patterns without needing a config
- ✍🏻 **Readability** - Removes obfuscator/bundler artifacts
- ⌨️ **TypeScript** - All code is written in TypeScript
- 🧪 **Tests** - To make sure nothing breaks

## Platforms

| Platform | Deobfuscate | Unminify | Unpack | Configurable |
| -------- | ----------- | -------- | ------ | ------------ |
| node     | ✅          | ✅       | ✅     | ✅           |
| cli      | ✅          | ✅       | ✅     | 🚧           |
| web      | ✅          | ✅       | ✅     | 🚧           |

🚧: only the `mangle` option can be toggled as of now

## Planned Features

- support older obfuscator.io versions
- unpack `rollup`, `parcel`, `swc`, etc.
- unpack multi-chunk bundles
- download zip of all unpacked modules in the playground
- convert [@babel/preset-env](https://babeljs.io/docs/babel-preset-env) helpers to modern syntax
- decompile typescript enums
- decompile other frontend frameworks: `vue`, `svelte`, etc.
