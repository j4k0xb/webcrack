# Transpile

Convert transpiled syntax back to modern JavaScript.

## default-parameters

<https://babeljs.io/docs/babel-plugin-transform-parameters>

```js
function f() { // [!code --]
  var x = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1; // [!code --]
  var y = arguments.length > 1 ? arguments[1] : undefined; // [!code --]
} // [!code --]

function f(x = 1, y) {} // [!code ++]
```

## logical-assignments

<https://babeljs.io/docs/babel-plugin-transform-logical-assignment-operators>, TypeScript and SWC

```js
x || (x = y) // [!code --]
x ||= y // [!code ++]
```

```js
var _x, _y; // [!code --]
(_x = x)[_y = y] && (_x[_y] = z); // [!code --]
x[y] &&= z; // [!code ++]
```

## nullish-coalescing

```js
a !== null && a !== undefined ? a : b; // [!code --]
a ?? b; // [!code ++]
```

```js
var _a$b; // [!code --]
(_a$b = a.b) !== null && _a$b !== undefined ? _a$b : c; // [!code --]
a.b ?? c; // [!code ++]
```

```js
function foo(foo, qux = (_foo$bar => (_foo$bar = foo.bar) !== null && _foo$bar !== undefined ? _foo$bar : "qux")()) {} // [!code --]
function foo(foo, qux = foo.bar ?? "qux") {} // [!code ++]
```

## nullish-coalescing-assignment

```js
a ?? (a = b); // [!code --]
a ??= b; // [!code ++]
```

```js
var _a; // [!code --]
(_a = a).b ?? (_a.b = c); // [!code --]
a.b ??= c; // [!code ++]
```

## optional-chaining

```js
a === null || a === undefined ? undefined : a.b; // [!code --]
a?.b; // [!code ++]
```

```js
var _a; // [!code --]
(_a = a) === null || _a === undefined ? undefined : _a.b; // [!code --]
a?.b; // [!code ++]
```

## template-literals

<https://babeljs.io/docs/babel-plugin-transform-template-literals>

```js
"'".concat(foo, "' \"").concat(bar, "\"") // [!code --]
`'${foo}' "${bar}"` // [!code ++]
```
