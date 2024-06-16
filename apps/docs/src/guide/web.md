# Website

On the [playground](https://webcrack.netlify.app/) you can deobfuscate code without installing anything.
It runs entirely in the browser, so the code never leaves your computer.

::: tip

- Press `F1` to open the command palette
- Press `Alt`+`Enter` to run webcrack on the code
- Press `Shift`+`Enter` to evaluate and replace the selected code as a value (`[[3+4]][0]` -> `[7]`)
- Press `Ctrl`+`Shift`+`Enter` to evaluate and replace the selected code raw (`'x' + ' = \'val\''` -> `x = 'val'` instead of a string)
- Press `Ctrl`+`S` to download the code

:::

## Query Parameters

Pass either `code` or `url` parameters to load code into the editor.
Keep in mind to encode them (e.g. `encodeURIComponent` in js).

| Parameter | Description                            |
| --------- | -------------------------------------- |
| `code`    | Code as a string (max length: ~16,000) |
| `url`     | URL to fetch code from                 |

Examples:

- [/?url=https://pastebin.com/raw/ye3usFvH](https://webcrack.netlify.app/?url=https%3A%2F%2Fpastebin.com%2Fraw%2Fye3usFvH)

::: info
Use this only if you don't mind netlify or corsproxy.io seeing the code/url, otherwise paste it directly into the editor.
:::
