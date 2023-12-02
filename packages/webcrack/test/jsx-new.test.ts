import { test } from 'vitest';
import { testTransform } from '.';
import jsxNew from '../src/transforms/jsx-new';

const expectJS = testTransform(jsxNew);

test('tag name type', () =>
  expectJS('jsx("div", {});').toMatchInlineSnapshot('<div />;'));

test('component type', () =>
  expectJS('jsx(TodoList, {});').toMatchInlineSnapshot('<TodoList />;'));

test('deeply nested member expression type', () =>
  expectJS('jsx(components.list.TodoList, {});').toMatchInlineSnapshot(
    '<components.list.TodoList />;',
  ));

test('rename component with conflicting name', () =>
  expectJS('function a(){} jsx(a, {});').toMatchInlineSnapshot(`
      function _Component() {}
      <_Component />;
    `));

test('attributes', () =>
  expectJS(
    'jsx("div", { "data-hover": "tooltip", style: { display: "block" } });',
  ).toMatchInlineSnapshot(`
      <div data-hover="tooltip" style={{
        display: "block"
      }} />;
    `));

test('spread attributes', () =>
  expectJS('jsx("div", {...props});').toMatchInlineSnapshot(
    '<div {...props} />;',
  ));

test('children', () =>
  expectJS(
    'jsx("div", { children: jsxs("span", { children: ["Hello ", name ] }) });',
  ).toMatchInlineSnapshot('<div><span>Hello {name}</span></div>;'));

test('component with key', () =>
  expectJS('jsx("div", {}, "test")').toMatchInlineSnapshot(
    '<div key="test" />;',
  ));

test('array expression child', () =>
  expectJS('jsx("div", { children: [1] })').toMatchInlineSnapshot(
    '<div>{[1]}</div>;',
  ));

test('fragment', () =>
  expectJS(
    'jsxs(React.Fragment, { children: [jsx("span", {}), "test"] });',
  ).toMatchInlineSnapshot('<><span />test</>;'));

test('fragment with key', () =>
  expectJS('jsx(React.Fragment, {}, o)').toMatchInlineSnapshot(
    '<React.Fragment key={o} />;',
  ));
