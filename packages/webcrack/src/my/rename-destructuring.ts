import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { renameFast, type Transform } from '../ast-utils';
import { generateUid } from '../ast-utils/scope';

export default {
    name: 'rename-destructuring',
    tags: ['safe'],
    scope: true,
    visitor() {
        const key = m.capture(m.anyString());
        const alias = m.capture(m.anyString());
        const matcher = m.objectProperty(
            m.identifier(key),
            m.or(m.identifier(alias), m.assignmentPattern(m.identifier(alias))),
        );

        return {
            ObjectPattern: {
                exit(path) {
                    for (const property of path.node.properties) {
                        if (!matcher.match(property)) continue;

                        if (key.current === alias.current) {
                            property.shorthand = true;
                        } else {
                            const binding = path.scope.getBinding(alias.current!);
                            if (!binding) continue;

                            const newName = generateUid(path.scope, key.current!);
                            renameFast(binding, newName);
                            property.shorthand = key.current === newName;
                            this.changes++;
                        }
                    }
                },
            },
            ImportSpecifier: {
                exit(path) {
                    if (
                        t.isIdentifier(path.node.imported) &&
                        path.node.imported.name !== path.node.local.name
                    ) {
                        const binding = path.scope.getBinding(path.node.local.name);
                        if (!binding) return;

                        const newName = generateUid(path.scope, path.node.imported.name);
                        renameFast(binding, newName);
                        this.changes++;
                    }
                },
            },
        };
    },
} satisfies Transform;