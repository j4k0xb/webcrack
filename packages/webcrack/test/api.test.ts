import { describe, expect, test } from "vitest";
import { webcrack } from "../src";

// const obfuscatedSrc = await readFile(
//   join(__dirname, "samples/obfuscator.io.js"),
//   "utf8",
// );
// const webpackSrc = await readFile(
//   join(__dirname, "samples/webpack.js"),
//   "utf8",
// );

describe("options", () => {
  test.skip("no deobfuscate", async () => {
    // await webcrack(webpackSrc, { deobfuscate: false });
  });

  test.skip("no unpack", async () => {
    // const result = await webcrack(webpackSrc, { unpack: false });
    // expect(result.bundle).toBeUndefined();
  });

  test("no jsx", async () => {
    const result = await webcrack('React.createElement("div", null)', {
      jsx: false,
    });
    expect(result.code).toBe('React.createElement("div", null);');
  });

  test.skip("custom sandbox", async () => {
    // const sandbox = vi.fn((code: string) =>
    //   /* isolated-vm or something */ Promise.resolve(code),
    // );
    // await webcrack(obfuscatedSrc, { sandbox });
    // expect(sandbox).toHaveBeenCalledOnce();
  });

  test("mangle", async () => {
    const result = await webcrack("const foo = 1;", { mangle: true });
    expect(result.code).not.contain("foo");
  });
});
