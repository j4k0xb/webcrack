/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ["@webcrack/eslint-config/index.js"],
  ignorePaths: ["vitest.config.ts"],
};
