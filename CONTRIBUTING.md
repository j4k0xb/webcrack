# Contributing

You can directly create a PR if the change is small. Otherwise, please open an issue first to discuss the change.

## Getting Started

This project uses [pnpm](https://pnpm.js.org/) for package management. Please make sure you have it installed before proceeding.

1. Fork and clone the repo
2. Check out a new branch: `git checkout -b some-feature`
3. Install dependencies: `pnpm install`
4. Test your changes in the playground: `pnpm dev`

## Before submitting a PR

Run `pnpm lint:fix format typecheck`

## Attach a Debugger

Press `F5` in VSCode to build the project and launch the debugger.
Choose any of these launch configurations:

- `Launch playground`: runs a dev server in the background and opens the playground in your browser.

  <https://github.com/j4k0xb/webcrack/assets/55899582/8d6509c6-7ec2-43c8-8d1b-8aac5b279e45>

- `Deobfuscate tmp file`: runs the CLI locally.
  1. Create the file `packages/webcrack/tmp/test.js` and paste your code
  2. The output will be saved in `tmp/webcrack-out`

## Tests

Run the tests with `pnpm test`.

`.toMatchInlineSnapshot()` for new tests will automatically generate the expected output when saved, no need to write it manually.

If the snapshots are outdated, make sure the changes are correct and update them:
![failed snapshot](https://user-images.githubusercontent.com/55899582/219093007-825a5056-38a0-4e8b-8512-b56e20174885.png)

The tests can also be debugged by installing the [Vitest extension](https://marketplace.visualstudio.com/items?itemName=vitest.explorer) and right-clicking on the play icon:
![vitest debug](https://github.com/j4k0xb/webcrack/assets/55899582/9661b202-7f85-4615-bf83-c132cfdaa9f7)

## Create a new Transform

The easiest way to create a new transform is to copy an existing one and modify it.

## Performance Optimizations

### Named Visitor Keys

```diff
{
- exit(path) { if (path.isIdentifier()) { ... } }
+ Identifier: { exit(path) { ... } }
}
```

### `noScope` Visitors

May not work in some cases (accessing `path.scope` when the scope hasn't been crawled before).

```diff
{
  Identifier(path) { ... },
+ noScope: true,
}
```

### Merging Visitors

To only traverse the AST once and avoid missing nodes based on the order of visitors.

```diff
- applyTransform(ast, transformA);
- applyTransform(ast, transformB);
+ applyTransforms(ast, [transformA, transformB]);
```

### Renaming Bindings (variables, functions, ...)

This also avoids conflicts by first renaming bindings with the name `b` to something else.

```diff
- path.scope.rename('a', 'b');
+ const binding = path.scope.getBinding('a')!;
+ renameFast(binding, 'b');
```

### Following References instead of Traversing the AST

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
