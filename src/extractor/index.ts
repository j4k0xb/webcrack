import * as t from '@babel/types';
import { Module } from './module';
import * as webpack from './webpack';

export interface BundleInfo {
  type: 'webpack' | 'webpack-jsonp' | 'parcel';
  entryId: number;
  modules: Map<number, Module>;
}

export function getBundleInfo(ast: t.Node): BundleInfo | undefined {
  return webpack.extract(ast);
}
