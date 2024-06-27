# Common Errors

## isolated-vm

If you see errors like

> - isolated_vm.node: undefined symbol: \_ZNK2v815ValueSerializer8Delegate20SupportsSharedValuesEv
> - ERR_DLOPEN_FAILED
> - Segmentation fault

it most likely means that the [isolated-vm](https://github.com/laverdet/isolated-vm) package was built against a different version of Node.js than the one you are using. This can happen if you upgrade Node.js after installing `webcrack`.

To fix this, run `npm rebuild isolated-vm` in your project directory or delete the `node_modules/isolated-vm` directory and run `npm install` again.

For Node 20.x and above, disabling snapshots may be necessary:

```sh
NODE_OPTIONS=--no-node-snapshot webcrack input.js
```

or

```sh
node --no-node-snapshot your-script.js
```

For any other issues, please refer to the [isolated-vm readme](https://github.com/laverdet/isolated-vm#requirements).

## Heap Out Of Memory

> FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory

Fix by running node with the [--max-old-space-size](https://nodejs.org/api/cli.html#--max-old-space-sizesize-in-megabytes) flag. For example:

```sh
NODE_OPTIONS="--max-old-space-size=8192" webcrack bundle.js
```

or

```sh
node --max-old-space-size=8192 your-script.js
```

## `__DECODE_0__`

If this appears in your code, the deobfuscator failed to decode a string from the string array.
This can happen in forked javascript-obfuscator versions or when `Dead Code Injection` is enabled.

[Open an issue](https://github.com/j4k0xb/webcrack/issues/new?assignees=&labels=bug&projects=&template=bug_report.yml) if you encounter this.
