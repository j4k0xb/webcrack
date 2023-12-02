# JSX

Tools such as [Babel](https://babeljs.io/), [TypeScript](https://www.typescriptlang.org/)
or bundlers convert JSX to `React.createElement` calls.
This feature does the opposite.

```jsx
React.createElement(
  'div',
  null,
  React.createElement('span', null, 'Hello ', name),
);
```

->

```jsx
<div>
  <span>Hello {name}</span>
</div>
```

:::info
This currently only works for the React **UMD** build, not when bundled.
:::
