# Introduction

webcrack is a tool for reverse engineering javascript.
It can deobfuscate [obfuscator.io](https://github.com/javascript-obfuscator/javascript-obfuscator), unminify,
and unpack [webpack](https://webpack.js.org/)/[browserify](https://browserify.org/),
to resemble the original source code as much as possible.

- 🚀 **Performance** - Various optimizations to make it fast
- 🛡️ **Safety** - Considers variable references and scope
- 🔬 **Auto-detection** - Finds code patterns without needing a config
- ✍🏻 **Readability** - Removes obfuscator/bundler artifacts
- ⌨️ **TypeScript** - All code is written in TypeScript
- 🧪 **Tests** - To make sure nothing breaks

## Planned Features

- Support older obfuscator.io versions
- Unpack `rollup`, `parcel`, `swc`, etc.
- Unpack multi-chunk bundles
- Download zip of all unpacked modules in the playground
- Convert [@babel/preset-env](https://babeljs.io/docs/babel-preset-env) helpers to modern syntax
- Decompile typescript enums
