# Unminify

Bundlers and obfuscators commonly minify code (remove new lines and whitespace, replace variable names with shorter ones, use a shorter syntax).

Most unminify sites just format the code, but webcrack also converts the syntax back to make it more readable and similar to the original code:

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
void 0; // undefined
'red' === color; // color === 'red'
JSON.parse('{"a":1}'); // { a: 1 }
```
