import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform } from '../../transforms';
import { constMemberExpression } from '../../utils/matcher';
import { renameParameters } from '../../utils/rename';
import { Bundle } from '../bundle';
import { ParcelBundle } from './bundle';
import { ParcelModule } from './module';

export const unpackParcel = {
  name: 'unpack-parcel',
  tags: ['unsafe'],
  visitor(options) {
    const modules = new Map<string, ParcelModule>();

    // "parcelRequire297e" (https://github.com/parcel-bundler/parcel/blob/0645f644238f6dbdadb8e01fa63be6ed2152830b/packages/packagers/js/src/index.js#L22)
    const parcelRequireName = m.matcher<string>(name =>
      (name as string).startsWith('parcelRequire')
    );
    const parcelRequire = m.capture(m.identifier());

    const moduleId = m.capture(
      m.matcher<string>(name => /^\w+$/.test(name as string))
    );
    const moduleWrapper = m.capture(m.functionExpression());
    // parcelRequire.register("YChVI", function (module, exports) { ... });
    const register = m.expressionStatement(
      m.callExpression(
        constMemberExpression(m.fromCapture(parcelRequire), 'register'),
        [m.stringLiteral(moduleId), moduleWrapper]
      )
    );

    const matcher = m.blockStatement(
      m.anyList(
        m.slice({ min: 1, max: 10 }),
        // var parcelRequire = $parcel$global.parcelRequire297e;
        m.variableDeclaration(undefined, [
          m.variableDeclarator(
            parcelRequire,
            constMemberExpression(m.identifier(), parcelRequireName)
          ),
        ]),
        // if (parcelRequire == null) {
        m.ifStatement(),
        m.oneOrMore(register),
        m.oneOrMore()
      )
    );

    return {
      BlockStatement(path) {
        if (!matcher.match(path.node)) return;
        path.stop();

        const entryFile = t.file(t.program([]));
        const entryModule = new ParcelModule('index', entryFile, true);
        modules.set('index', entryModule);

        for (const statement of path.get('body')) {
          if (register.match(statement.node)) {
            const wrapperPath = statement.get(
              moduleWrapper.currentKeys!.join('.')
            ) as NodePath<t.Function>;
            renameParameters(wrapperPath, ['module', 'exports']);

            const file = t.file(t.program(moduleWrapper.current!.body.body));
            const module = new ParcelModule(moduleId.current!, file, false);
            modules.set(moduleId.current!, module);
          } else if (modules.size > 0) {
            entryFile.program.body.push(statement.node);
          }
        }

        if (modules.size > 0) {
          options!.bundle = new ParcelBundle('index', modules);
        }
      },
      noScope: true,
    };
  },
} satisfies Transform<{ bundle: Bundle | undefined }>;
