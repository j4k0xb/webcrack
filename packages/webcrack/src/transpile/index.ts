import { Transform, applyTransforms } from '../ast-utils';
import * as transforms from './transforms';

export const transpile = {
  name: 'transpile',
  tags: ['safe'],
  scope: true,
  run(ast, state) {
    state.changes += applyTransforms(ast, Object.values(transforms), {
      log: false,
    }).changes;
  },
} satisfies Transform;
