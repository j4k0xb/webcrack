import * as t from '@babel/types';
import * as browserify from './browserify';
import { Bundle } from './bundle';
import * as parcel from './parcel';
import * as webpack from './webpack';

export function extractBundle(ast: t.Node): Bundle | undefined {
  // TODO: merge visitors
  return webpack.extract(ast) ?? browserify.extract(ast) ?? parcel.extract(ast);
}
