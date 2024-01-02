declare module 'babel-plugin-minify-mangle-names' {
  import type { Visitor, traverse } from '@babel/traverse';
  import type * as t from '@babel/types';

  export default function mangle(babel: Babel): {
    visitor: Visitor;
  };

  interface Babel {
    types: typeof t;
    traverse: typeof traverse;
  }
}
