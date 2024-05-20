# Common Errors

## isolated-vm

If you see errors like

> - isolated_vm.node: undefined symbol: \_ZNK2v815ValueSerializer8Delegate20SupportsSharedValuesEv
> - ERR_DLOPEN_FAILED
> - Segmentation fault

it most likely means that the [isolated-vm](https://github.com/laverdet/isolated-vm) package was built against a different version of Node.js than the one you are using. This can happen if you upgrade Node.js after installing `webcrack`.

To fix this, run `npm rebuild isolated-vm` in your project directory or delete the `node_modules/isolated-vm` directory and run `npm install` again.

> ```sh
> npm error prebuild-install warn install No prebuilt binaries found (target=22.1.0 runtime=node arch=arm64 libc= platform=darwin)
> ...
> npm error ../src/isolate/generic/error.h:84:65: error: value of type 'Local<Value> (Local<String>, Local<Value>)' is not implicitly convertible to 'v8::Local<v8::Value> (*)(v8::Local<v8::String>)'
> npm error using RuntimeGenericError = detail::RuntimeErrorWithConstructor<v8::Exception::Error>;
> ```

When there are no prebuilt binaries available (Apple Silicon) and you are using Node.js v22, try switching to Node.js v20 ([see issue](https://github.com/laverdet/isolated-vm/issues/468)).

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
