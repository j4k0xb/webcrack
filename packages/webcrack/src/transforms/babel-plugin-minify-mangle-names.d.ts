declare module "babel-plugin-minify-mangle-names" {
  import { Visitor, traverse } from "@babel/traverse";
  import * as t from "@babel/types";

  export default function mangle(babel: Babel): {
    visitor: Visitor;
  };

  interface Babel {
    types: typeof t;
    traverse: typeof traverse;
  }
}
