import { parse } from "@babel/parser";
import {
  applyTransform,
  applyTransforms,
  generate,
  Transform,
} from "@webcrack/ast-utils";
import * as transforms from "./transforms";

export const unminify = {
  name: "unminify",
  tags: ["safe"],
  scope: true,
  run(ast, state) {
    state.changes += applyTransforms(ast, Object.values(transforms)).changes;
  },
} satisfies Transform;

export function unminifySource(code: string): string {
  const ast = parse(code, {
    sourceType: "unambiguous",
    allowReturnOutsideFunction: true,
    plugins: ["jsx"],
  });

  applyTransform(ast, unminify);

  return generate(ast);
}
