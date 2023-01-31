# webcrack

[![npm](https://img.shields.io/npm/v/webcrack)](https://www.npmjs.com/package/webcrack)
[![license](https://img.shields.io/github/license/j4k0xb/webcrack)](/LICENSE)

Blazingly fast deobfuscator, unminifier and bundle unpacker for javascript

## Usage

```sh
npx webcrack <file>
```

## Deobfuscations

[obfuscator.io](https://obfuscator.io):

- String Array
  - Rotate
  - Shuffle
  - Index Shift
  - Variable Wrapper Type
  - None/Base64/RC4 encoding
- Numbers To Expressions

General/unminifying:

```js
console['\x6c\x6f\x67']('\x61'); // console.log('a')
x && y && z(); // if (x && y) z();
x || y || z(); // if (!(x || y)) z();
!0; // true
!1; // false
![]; // false
!![]; // true
return a(), b(), c(); // a(); b(); return c();
if ((a(), b())) c(); // a(); if (b()) c();
```
