import * as t from "@babel/types";
import { Transform } from "@webcrack/ast-utils";

export default {
  name: "split-variable-declarations",
  tags: ["safe"],
  visitor: () => ({
    VariableDeclaration: {
      exit(path) {
        if (path.node.declarations.length > 1 && path.key !== "init") {
          if (path.parentPath.isExportNamedDeclaration()) {
            path.parentPath.replaceWithMultiple(
              path.node.declarations.map((declaration) =>
                t.exportNamedDeclaration(
                  t.variableDeclaration(path.node.kind, [declaration]),
                ),
              ),
            );
          } else {
            path.replaceWithMultiple(
              path.node.declarations.map((declaration) =>
                t.variableDeclaration(path.node.kind, [declaration]),
              ),
            );
          }
          this.changes++;
        }
      },
    },
  }),
} satisfies Transform;
