import { parse } from "@babel/parser";
import { Transform, applyTransform } from "@webcrack/ast-utils";
import { expect } from "vitest";

export function testTransform<Options>(transform: Transform<Options>) {
  return (input: string, options?: Options) => {
    const ast = parse(input, {
      sourceType: "unambiguous",
      allowReturnOutsideFunction: true,
    });
    applyTransform(ast, transform, options);
    return expect(ast);
  };
}
