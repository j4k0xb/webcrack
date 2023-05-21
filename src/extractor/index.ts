import * as t from '@babel/types';
import * as browserify from './browserify';
import { Bundle } from './bundle';
import * as webpack from './webpack';

export function extractBundle(ast: t.Node): Bundle | undefined {
  return webpack.extract(ast) ?? browserify.extract(ast);
}
