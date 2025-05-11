import { test } from 'vitest';
import { testTransform } from '../../../test';
import mergeElseIf from '../transforms/merge-else-if';

const expectJS = testTransform(mergeElseIf);

test('merge', () => {
  expectJS(`
    if (x) {
    } else {
      if (y) {}
    }`).toMatchInlineSnapshot('if (x) {} else if (y) {}');

  expectJS(`
    if (!cond) {
      if (cond2 !== 5) {
        if (cond3) {
          console.log("branch 3");
        } else {
          console.log("branch 4");
        }
      } else {
        console.log("branch 2");
      }
    } else {
      console.log("branch 1");
    }`).toMatchInlineSnapshot(`
      if (!!cond) {
        console.log("branch 1");
      } else if (cond2 === 5) {
        console.log("branch 2");
      } else if (cond3) {
        console.log("branch 3");
      } else {
        console.log("branch 4");
      }
    `);

  expectJS(`
    if (!cond) {
      if (cond2) {
        console.log("branch 2");
      }
    }`).toMatchInlineSnapshot(`
      if (!cond) {
        if (cond2) {
          console.log("branch 2");
        }
      }
    `);

  expectJS(`
    if (!cond) {
      console.log("branch 1");
    } else {
      console.log("branch 2");
    }`).toMatchInlineSnapshot(`
      if (cond) {
        console.log("branch 2");
      } else {
        console.log("branch 1");
      }
    `);
});

test('ignore when it contains other statements', () =>
  expectJS(`
    if (x) {
    } else {
      if (y) {}
      z();
    }`).toMatchInlineSnapshot(`
      if (x) {} else {
        if (y) {}
        z();
      }
    `));
