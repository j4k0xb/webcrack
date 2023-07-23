# Contributing

You can directly create a PR if the change is small. Otherwise, please open an issue first to discuss the change.

The `package.json` version shouldn't be changed.

## Getting Started

1. Fork and clone the repo
2. Install dependencies: `npm install`

Debugging in VSCode:

1. Create a `tmp` directory with `test.js` inside and paste your code
2. Press `F5` to build the project and launch the debugger

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

## Performance Optimizations

### Named visitor keys

```diff
{
- exit(path) { if (path.isIdentifier()) { ... } }
+ Identifier: { exit(path) { ... } }
}
```

### `noScope` visitors

May not work in some cases (accessing `path.scope` when the scope hasn't been crawled before).

```diff
{
  Identifier(path) { ... },
+ noScope: true,
}
```

### Merging visitors

To only traverse the AST once and avoid missing nodes based on the order of visitors.

```diff
- applyTransform(ast, transformA);
- applyTransform(ast, transformB);
+ applyTransforms(ast, [transformA, transformB]);
```

### Renaming bindings (variables, functions, ...)

This also avoids conflicts by first renaming bindings with the name `b` to something else.

```diff
- path.scope.rename('a', 'b');
+ const binding = path.scope.getBinding('a')!;
+ renameFast(binding, 'b');
```

### Following references instead of traversing the AST

For example finding calls to a function `foo` (provided that you already have foo's NodePath):

```diff
const matcher = m.callExpression(m.identifier('foo'));
- traverse(ast, {
-   CallExpression(path) {
-     if (matcher.match(path.node)) { ... }
-   }
- });
+ const binding = fooPath.scope.getBinding('foo')!;
+ for (const reference of binding.referencePaths) {
+   if (matcher.match(reference.parent)) { ... }
+ }
```

## Resources

- [Babel Handbook](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md) - general overview of AST and code transformations
- [AST Explorer](https://astexplorer.net/#/gist/b2ea907946274ad62ff348f403e58460/0cbd22f94e8b3231fef5d07eeb82d326798f7040) - visualize the AST and test transforms
- [@codemod/matchers](https://github.com/codemod-js/codemod/blob/main/packages/matchers/README.md) - a much cleaner way of finding AST structures
- [ReverseJS](https://steakenthusiast.github.io/) - blog posts about creating deobfuscators with Babel
- [Bubbl.es](https://jsbubbl.es) - scope visualizer
- [Vitest](https://vitest.dev/guide) - for tests
