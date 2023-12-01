import { test } from "vitest";
import { testTransform } from ".";
import { mergeStrings } from "../src/transforms";

const expectJS = testTransform(mergeStrings);

test("only strings", () =>
  expectJS(`
    "a" + "b" + "c";
  `).toMatchInlineSnapshot('"abc";'));

test("with variables", () =>
  expectJS(`
    "a" + "b" + xyz + "c" + "d";
  `).toMatchInlineSnapshot('"ab" + xyz + "cd";'));
