import * as t from "@babel/types";
import { generate } from "@webcrack/ast-utils";
import { expect } from "vitest";

expect.addSnapshotSerializer({
  test: (val: unknown) => t.isNode(val) && !("parentPath" in val),
  serialize: (val: t.Node) => generate(val),
});
