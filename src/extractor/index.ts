import * as t from '@babel/types';
import { Module } from './module';
import * as webpack from './webpack';

export interface BundleInfo {
  type: 'webpack' | 'webpack-jsonp' | 'parcel';
  entryId: number;
  modules: Map<number, Module>;
}

export function getBundleInfo(ast: t.File): BundleInfo | undefined {
  try {
    const info = webpack.getModules(ast);
    return { type: 'webpack', ...info };
  } catch (error) {}
}
