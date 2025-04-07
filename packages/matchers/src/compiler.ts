import type { NodePath, Visitor } from '@babel/traverse';
import * as t from '@babel/types';
import {
  type ArraySchema,
  type CaptureMatcher,
  type Matcher,
  type NodeSchema,
  type NullableSchema,
  type OrMatcher,
  type Schema,
} from './types.js';

export type CompiledMatcher<T extends t.Node> = (
  input: T,
) => object | undefined;

interface Context {
  captures: string[];
}

/**
 * **Warning**: only compile a schema from trustworthy sources.
 * Otherwise, it could lead to code injection attacks.
 */
export function compile<T extends t.Node>(
  schema: NodeSchema<T>,
): CompiledMatcher<T> {
  const context: Context = { captures: [] };
  const checks = compileNode(schema, 'input', context, false);
  const code = `
const captures = { ${context.captures.map((v) => `${v}: undefined`).join(', ')} };
if (${checks ?? true}) { return captures; }`;

  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return Function('input', code) as CompiledMatcher<T>;
}

/**
 * **Warning**: only compile a schema from trustworthy sources.
 * Otherwise, it could lead to code injection attacks.
 */
export function compileVisitor<T extends t.Node>(
  schema: NodeSchema<T>,
  cb: (path: NodePath<T>) => void,
  phase: 'enter' | 'exit' = 'enter',
): Visitor {
  const context: Context = { captures: [] };
  const checks = compileNode(schema, 'input', context, false);
  const code = `
const captures = { ${context.captures.map((v) => `${v}: undefined`).join(', ')} };
if (${checks ?? true}) { cb(captures); }`;

  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const match = Function('input', code) as (
    input: T,
    cb: (path: NodePath<T>) => void,
  ) => void;

  return {
    [schema.type]: {
      [phase](path: NodePath<T>) {
        match(path.node, cb);
      },
    },
  };
}

type CompileFunction = (
  schema: never,
  input: string,
  ctx: Context,
) => string | null;

const compilers: Record<string, CompileFunction> = {
  nullable: compileNullable,
  tuple: compileTuple,
  arrayOf: compileArrayOf,
  or: compileOr,
  capture: compileCapture,
  fromCapture: () => null,
};
Object.keys(t.BUILDER_KEYS).forEach((type) => {
  compilers[type as t.Node['type']] = compileNode;
});

function compileSchema(
  schema: Schema<unknown>,
  input: string,
  ctx: Context,
): string | null {
  if (schema === undefined) {
    return null;
  } else if (
    typeof schema === 'string' ||
    typeof schema === 'number' ||
    typeof schema === 'boolean' ||
    schema === null
  ) {
    return `${input} === ${JSON.stringify(schema)}`;
  } else if (Array.isArray(schema)) {
    return compileTuple(schema, input, ctx);
  } else {
    return compileMatcher(schema as Matcher<unknown>, input, ctx);
  }
}

function compileMatcher(
  matcher: Matcher<unknown>,
  input: string,
  ctx: Context,
): string | null {
  return compilers[matcher.type](matcher as never, input, ctx);
}

function compileTuple(
  schema: Schema<unknown>[],
  input: string,
  ctx: Context,
): string | null {
  const checks = [
    `${input}.length === ${schema.length}`,
    ...schema
      .map((m, i) => compileSchema(m, `${input}[${i}]`, ctx))
      .filter((c) => c !== null),
  ];
  return checks.join(' && ');
}

function compileArrayOf(
  schema: ArraySchema<unknown>,
  input: string,
  ctx: Context,
): string | null {
  const checks = compileSchema(schema.schema, 'element', ctx);
  if (checks === null) return null;
  return `${input}.every(element => ${checks})`;
}

function compileNullable(
  schema: NullableSchema<unknown>,
  input: string,
  ctx: Context,
): string | null {
  const checks = compileSchema(schema.schema, input, ctx);
  if (checks === null) return null;
  return `(${input} === null || ${checks})`;
}

function compileOr(schema: OrMatcher<unknown[]>, input: string, ctx: Context) {
  const checks = schema.schema
    .map((m) => compileSchema(m, input, ctx))
    .filter((c) => c !== null);
  if (checks.length === 0) return null;
  return `(${checks.join(' || ')})`;
}

function compileCapture(
  schema: CaptureMatcher<unknown>,
  input: string,
  ctx: Context,
) {
  ctx.captures.push(schema.name);
  const checks = compileSchema(schema.schema, input, ctx);
  if (checks === null) {
    return `(captures['${schema.name}'] = ${input}, true)`;
  } else {
    return `${checks} && (captures['${schema.name}'] = ${input}, true)`;
  }
}

function compileNode(
  schema: NodeSchema<t.Node>,
  input: string,
  ctx: Context,
  checkType = true,
) {
  const checks: string[] = [];
  if (checkType) {
    checks.push(`${input}.type === '${schema.type}'`);
  }

  const fields = t.NODE_FIELDS[schema.type];

  for (const key in fields) {
    const value = schema[key as never] as Schema<unknown>;
    const valueChecks = compileSchema(value, `${input}.${key}`, ctx);
    if (valueChecks === null) continue;

    const validator = fields[key];
    if (value !== null && validator.optional) {
      // TODO: only when all checks includes property accesses
      checks.push(`${input}.${key} != null`);
    }
    checks.push(valueChecks);
  }

  return checks.length ? checks.join(' && ') : null;
}
