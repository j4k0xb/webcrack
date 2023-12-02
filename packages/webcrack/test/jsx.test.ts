import { test } from "vitest";
import { testTransform } from ".";
import jsx from "../src/transforms/jsx";

const expectJS = testTransform(jsx);

test("tag name type", () =>
  expectJS('React.createElement("div", null);').toMatchInlineSnapshot(
    "<div />;",
  ));

test("component type", () =>
  expectJS("React.createElement(TodoList, null);").toMatchInlineSnapshot(
    "<TodoList />;",
  ));

test("deeply nested member expression type", () =>
  expectJS(
    "React.createElement(components.list.TodoList, null);",
  ).toMatchInlineSnapshot("<components.list.TodoList />;"));

test("rename component with conflicting name", () =>
  expectJS("function a(){} React.createElement(a, null);")
    .toMatchInlineSnapshot(`
    function _Component() {}
    <_Component />;
  `));

test("attributes", () =>
  expectJS(
    'React.createElement("div", { "data-hover": "tooltip", style: { display: "block" } });',
  ).toMatchInlineSnapshot(`
  <div data-hover="tooltip" style={{
    display: "block"
  }} />;
`));

test("spread attributes", () =>
  expectJS('React.createElement("div", {...props});').toMatchInlineSnapshot(
    "<div {...props} />;",
  ));

test("children", () =>
  expectJS(
    'React.createElement("div", null, React.createElement("span", null, "Hello ", name));',
  ).toMatchInlineSnapshot("<div><span>Hello {name}</span></div>;"));

test("spread children", () =>
  expectJS(
    'React.createElement("div", null, ...children);',
  ).toMatchInlineSnapshot("<div>{...children}</div>;"));

test("fragment", () =>
  expectJS(
    'React.createElement(React.Fragment, null, React.createElement("span", null), "test");',
  ).toMatchInlineSnapshot("<><span />test</>;"));

test("fragment with key", () =>
  expectJS(
    "React.createElement(React.Fragment, { key: o })",
  ).toMatchInlineSnapshot("<React.Fragment key={o} />;"));

test("fragment with children", () =>
  expectJS(
    'React.createElement(React.Fragment, null, "test", ...children);',
  ).toMatchInlineSnapshot("<>test{...children}</>;"));
