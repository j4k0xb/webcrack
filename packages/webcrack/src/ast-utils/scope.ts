import type { Scope } from '@babel/traverse';
import { toIdentifier } from '@babel/types';

/**
 * Like scope.generateUid from babel, but without the underscore prefix and name filters
 */
export function generateUid(scope: Scope, name: string = 'temp'): string {
  let uid = '';
  let i = 1;
  do {
    uid = toIdentifier(i > 1 ? `${name}${i}` : name);
    i++;
  } while (
    scope.hasLabel(uid) ||
    scope.hasBinding(uid) ||
    scope.hasGlobal(uid) ||
    scope.hasReference(uid)
  );

  const program = scope.getProgramParent();
  program.references[uid] = true;
  program.uids[uid] = true;
  return uid;
}
