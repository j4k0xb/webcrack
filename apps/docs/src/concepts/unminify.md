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

## infinity

```js
1 / 0 // [!code --]
Infinity // [!code ++]
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
while (a(), b()) {} // [!code --]
a(); // [!code ++]
while (b()) {} // [!code ++]
```

```js
t = (o = null, o); // [!code --]
o = null; // [!code ++]
t = o; // [!code ++]
```

## split-variable-declarations

```js
const a = 1, b = 2, c = 3; // [!code --]
const a = 1; // [!code ++]
const b = 2; // [!code ++]
const c = 3; // [!code ++]
```

## template-literals

<https://babeljs.io/docs/babel-plugin-transform-template-literals>

```js
"'".concat(foo, "' \"").concat(bar, "\"") // [!code --]
`'${foo}' "${bar}"` // [!code ++]
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
