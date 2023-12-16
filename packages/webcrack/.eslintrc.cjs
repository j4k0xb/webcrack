/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ['@webcrack/eslint-config/index.js'],
  ignorePatterns: ['tmp/**/*', 'test/samples/**/*'],
};
