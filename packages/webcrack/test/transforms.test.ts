import { parse } from "@babel/parser";
import { Transform, applyTransform } from "@webcrack/ast-utils";
import { Assertion, describe as describeVitest, expect, test } from "vitest";
import { webcrack } from "../src";
import jsx from "../src/transforms/jsx";
import jsxNew from "../src/transforms/jsx-new";

function describe<Options>(
  transform: Transform<Options>,
  factory: (
    expect: (actualCode: string, options?: Options) => Assertion<Node>,
  ) => void,
) {
  return describeVitest(transform.name, () => {
    factory((actualCode, options) => {
      const ast = parse(actualCode, {
        sourceType: "unambiguous",
        allowReturnOutsideFunction: true,
      });
      applyTransform(ast, transform, options);
      return expect(ast);
    });
  });
}

test("decode bookmarklet", async () => {
  const code = `javascript:(function()%7Balert('hello%20world')%3B%7D)()%3B`;
  const result = await webcrack(code);
  expect(result.code).toMatchInlineSnapshot(`
    "(function () {
      alert(\\"hello world\\");
    })();"
  `);
});

describe(jsx, (expectJS) => {
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

  test("fragment", () =>
    expectJS(
      'React.createElement(React.Fragment, null, React.createElement("span", null), "test");',
    ).toMatchInlineSnapshot("<><span />test</>;"));

  test("fragment with key", () =>
    expectJS(
      "React.createElement(React.Fragment, { key: o })",
    ).toMatchInlineSnapshot("<React.Fragment key={o} />;"));
});

describe(jsxNew, (expectJS) => {
  test("tag name type", () =>
    expectJS('jsx("div", {});').toMatchInlineSnapshot("<div />;"));

  test("component type", () =>
    expectJS("jsx(TodoList, {});").toMatchInlineSnapshot("<TodoList />;"));

  test("deeply nested member expression type", () =>
    expectJS("jsx(components.list.TodoList, {});").toMatchInlineSnapshot(
      "<components.list.TodoList />;",
    ));

  test("rename component with conflicting name", () =>
    expectJS("function a(){} jsx(a, {});").toMatchInlineSnapshot(`
      function _Component() {}
      <_Component />;
    `));

  test("attributes", () =>
    expectJS(
      'jsx("div", { "data-hover": "tooltip", style: { display: "block" } });',
    ).toMatchInlineSnapshot(`
      <div data-hover="tooltip" style={{
        display: "block"
      }} />;
    `));

  test("spread attributes", () =>
    expectJS('jsx("div", {...props});').toMatchInlineSnapshot(
      "<div {...props} />;",
    ));

  test("children", () =>
    expectJS(
      'jsx("div", { children: jsxs("span", { children: ["Hello ", name ] }) });',
    ).toMatchInlineSnapshot("<div><span>Hello {name}</span></div>;"));

  test("component with key", () =>
    expectJS('jsx("div", {}, "test")').toMatchInlineSnapshot(
      '<div key="test" />;',
    ));

  test("array expression child", () =>
    expectJS('jsx("div", { children: [1] })').toMatchInlineSnapshot(
      "<div>{[1]}</div>;",
    ));

  test("fragment", () =>
    expectJS(
      'jsxs(React.Fragment, { children: [jsx("span", {}), "test"] });',
    ).toMatchInlineSnapshot("<><span />test</>;"));

  test("fragment with key", () =>
    expectJS("jsx(React.Fragment, {}, o)").toMatchInlineSnapshot(
      "<React.Fragment key={o} />;",
    ));
});
