# Command Line Interface

Install the package globally:

```bash
npm install -g webcrack
```

```txt
Usage: webcrack [options] [file]

Arguments:
  file                 input file, defaults to stdin

Options:
  -V, --version        output the version number
  -o, --output <path>  output directory for bundled files
  -f, --force          overwrite output directory
  -m, --mangle         mangle variable names
  -h, --help           display help for command
```

The code can be passed as a file or via stdin:

```bash
webcrack input.js
# or download/pipe a script from a website
curl https://pastebin.com/raw/ye3usFvH | webcrack
```

By default it outputs debug logs and the deobfuscated/unminified code to the terminal.
To write the code to a file, you can do:

```bash
webcrack input.js > output.js
```

## Bundle Unpacking

Use the `-o` option to unpack a bundle into a directory:

```bash
webcrack bundle.js -o output
```

The output directory will contain the following files:

- `deobfuscated.js` - deobfuscated/unminified code
- `bundle.json` - bundle type and module ids/paths
- `index.js` - entry point
- all remaining modules (`1.js`, `2.js`, etc.)

::: tip
You can modify the unpacked modules and bundle them again:

```bash
npx webpack-cli ./output/index.js
```

Depending on how the bundle was created, you may need a custom [webpack config](https://webpack.js.org/configuration).
:::
