# Contributing

You can directly create a PR if the change is small. Otherwise, please open an issue first to discuss the change.

The `package.json` version shouldn't be changed.

## Getting Started

1. Fork and clone the repo
2. Install dependencies: `npm install`

If you want to run the CLI:

1. Compile TypeScript: `npm run watch`
2. Run: `npm start -- someFile.js`

## Tests

Run the tests in watch mode with `npm test` (or use the [Vitest](https://marketplace.visualstudio.com/items?itemName=ZixuanChen.vitest-explorer) vscode extension).

If the snapshots are outdated, make sure the changes are correct and update them:

![failed snapshot](https://user-images.githubusercontent.com/55899582/219093007-825a5056-38a0-4e8b-8512-b56e20174885.png)

### About the tests

- When working on a transform, you should add a test for it in [transforms.test.ts](test/transforms.test.ts)
- When working on the deobfuscator or bundle unpacker, you should add/modify a [sample script](test/samples), and add a unit test if necessary (e.g. for a public JS API)

The samples should be as small as possible, but still representative.

## Create a new transform

The easiest way to create a new transform is to copy an existing one and modify it.
Make sure to also add it to the [transforms list](src/transforms/index.ts).

## Resources

- [Babel Handbook](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md) for a general overview of AST and code transformations
- [AST explorer](https://astexplorer.net) (choose the `@babel/parser` parser)
- [@codemod/matchers](https://github.com/codemod-js/codemod/blob/main/packages/matchers/README.md) is a much cleaner way of finding AST structures
- [Vitest](https://vitest.dev/guide) for tests
