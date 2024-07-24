# Unminify

Bundlers and obfuscators commonly minify code (remove new lines and whitespace, replace variable names with shorter ones, use a shorter syntax).

Most unminify sites just format the code, but webcrack also converts the syntax back to make it more readable and similar to the original code:

## block-statement

```js
if (a) b(); // [!code --]
if (a) { // [!code ++]
  b();  // [!code ++]
} // [!code ++]
```

## computed-properties

```js
console["log"](a); // [!code --]
console.log(a); // [!code ++]
```

## for-to-while

```js
for (;;) a(); // [!code --]
while (true) a(); // [!code ++]
```

```js
for (; a < b;) c(); // [!code --]
while (a < b) c(); // [!code ++]
```

## infinity

```js
1 / 0 // [!code --]
Infinity // [!code ++]
```

## invert-boolean-logic

```js
!(a == b) // [!code --]
a != b // [!code ++]
```

```js
!(a || b || c) // [!code --]
!a && !b && !c // [!code ++]
```

```js
!(a && b && c) // [!code --]
!a || !b || !c // [!code ++]
```

## json-parse

```js
JSON.parse("[1,2,3]") // [!code --]
[1, 2, 3] // [!code ++]
```

## logical-to-if

```js
x && y && z(); // [!code --]
if (x && y) { // [!code ++]
  z(); // [!code ++]
} // [!code ++]
```

```js
x || y || z(); // [!code --]
if (!(x || y)) { // [!code ++]
  z(); // [!code ++]
} // [!code ++]
```

## merge-else-if

```js
if (x) {
} else {  // [!code --]
  if (y) {}  // [!code --]
}  // [!code --]

if (x) {
} else if (y) {} // [!code ++]
```

## merge-strings

```js
"a" + "b" + "c" // [!code --]
"abc" // [!code ++]
```

## number-expressions

```js
-0x1021e + -0x7eac8 + 0x17 * 0xac9c // [!code --]
431390 // [!code ++]
```

## raw-literals

```js
'\x61"\u270F\uFE0F\t' // [!code --]
"a\"✏️\t" // [!code ++]
```

```js
0x1 // [!code --]
1 // [!code ++]
```

## remove-double-not

```js
if (!!a) b(); // [!code --]
if (a) b(); // [!code ++]
```

```js
!!a ? b() : c(); // [!code --]
a ? b() : c(); // [!code ++]
```

```js
return !!!a; // [!code --]
return !a; // [!code ++]
```

```js
[].filter(a => !!a); // [!code --]
[].filter(a => a); // [!code ++]
```

## sequence

```js
if (a) b(), c(); // [!code --]
if (a) { // [!code ++]
  b(); // [!code ++]
  c(); // [!code ++]
} // [!code ++]
```

```js
if (a(), b()) c(); // [!code --]
a(); // [!code ++]
if (b()) { // [!code ++]
  c(); // [!code ++]
} // [!code ++]
```

```js
return a(), b(), c(); // [!code --]
a(); // [!code ++]
b(); // [!code ++]
return c(); // [!code ++]
```

```js
for (let key in a = 1, object) {} // [!code --]
a = 1; // [!code ++]
for (let key in object) {} // [!code ++]
```

```js
for (let value of (a = 1, array)) {} // [!code --]
a = 1; // [!code ++]
for (let value of array) {} // [!code ++]
```

```js
for((a(), b());;) {} // [!code --]
a(); // [!code ++]
b(); // [!code ++]
for(;;) {} // [!code ++]
```

```js
for(; i < 10; a(), b(), i++) {} // [!code --]
for(; i < 10; i++) { // [!code ++]
  a(); // [!code ++]
  b(); // [!code ++]
} // [!code ++]
```

```js
a = (b = null, c); // [!code --]
b = null; // [!code ++]
a = c; // [!code ++]
```

## split-for-loops-vars

Minifiers commonly inline variables into for loops. Example: [esbuild](https://esbuild.github.io/try/#dAAwLjE5LjExAC0tbWluaWZ5AHZhciBqID0gMDsKZm9yICh2YXIgaSA9IDA7IGkgPCAzOyBpKyspIHt9)

To improve readability we only move the variables outside that are not used in the loop's test or update expressions.

```js
for (var j = 0, i = 0; i < 3; i++) {} // [!code --]
var j = 0; // [!code ++]
for (var i = 0; i < 3; i++) {} // [!code ++]
```

## split-variable-declarations

```js
const a = 1, b = 2, c = 3; // [!code --]
const a = 1; // [!code ++]
const b = 2; // [!code ++]
const c = 3; // [!code ++]
```

## ternary-to-if

```js
a ? b() : c(); // [!code --]
if (a) { // [!code ++]
  b(); // [!code ++]
} else { // [!code ++]
  c(); // [!code ++]
} // [!code ++]
```

```js
return a ? b() : c(); // [!code --]
if (a) { // [!code ++]
  return b(); // [!code ++]
} else { // [!code ++]
  return c(); // [!code ++]
} // [!code ++]
```

## typeof-undefined

```js
typeof a > "u" // [!code --]
typeof a === "undefined" // [!code ++]
```

```js
typeof a < "u" // [!code --]
typeof a !== "undefined" // [!code ++]
```

## unminify-booleans

```js
!0 // [!code --]
true // [!code ++]
```

```js
!1 // [!code --]
false // [!code ++]
```

## void-to-undefined

```js
void 0 // [!code --]
undefined // [!code ++]
```

## yoda

<https://eslint.org/docs/latest/rules/yoda> and <https://babeljs.io/docs/en/babel-plugin-minify-flip-comparisons>

```js
"red" === color // [!code --]
color === "red" // [!code ++]
```
