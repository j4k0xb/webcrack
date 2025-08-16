import type { NodePath, Visitor } from '@babel/traverse';
import * as t from '@babel/types';
import {
  type ArraySchema,
  type CaptureMatcher,
  type FromCaptureMatcher,
  type Matcher,
  type NodeSchema,
  type NullableSchema,
  type OrMatcher,
  type Schema,
} from './types.js';

interface Context {
  captures: Map<string, Schema<unknown>>;
}

/**
 * **Warning**: only compile a schema from trustworthy sources.
 * Otherwise, it could lead to code injection attacks.
 */
export function compile(
  schema: NodeSchema<t.Node>,
  checkType?: true,
): (input: t.Node) => object | undefined;
export function compile<T extends t.Node>(
  schema: NodeSchema<T>,
  checkType: false,
): (input: T) => object | undefined;
export function compile<T extends t.Node>(
  schema: NodeSchema<T>,
  checkType = true,
): (input: t.Node) => object | undefined {
  const context: Context = { captures: new Map() };
  const checks = compileNode(schema, 'node', context, checkType);
  const code = `
const captures = { ${Array.from(context.captures.keys(), (name) => `${name}: undefined`).join(', ')} };
if (${checks ?? true}) { return captures; }`;

  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return Function('node', code) as never;
}

/**
 * **Warning**: only compile a schema from trustworthy sources.
 * Otherwise, it could lead to code injection attacks.
 */
export function compileVisitor<T extends t.Node>(
  schema: NodeSchema<T>,
  phase: 'enter' | 'exit' = 'enter',
): <S = unknown>(cb: VisitNodeFunction<S, T>) => Visitor<S> {
  const context: Context = { captures: new Map() };
  const checks = compileNode(schema, 'node', context, false);
  const code = `
const node = path.node;
const captures = { ${Array.from(context.captures.keys(), (name) => `${name}: undefined`).join(', ')} };
if (${checks ?? true}) { cb.call(state, path, state, captures); }`;

  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const match = Function('path', 'state', 'cb', code) as (
    path: NodePath<T>,
    state: unknown,
    cb: VisitNodeFunction<unknown, T>,
  ) => void;

  return <S>(cb: VisitNodeFunction<S, T>) => ({
    [schema.type]: {
      [phase](path: NodePath<T>, state: S) {
        match(path, state, cb as never);
      },
    },
  });
}

export type VisitNodeFunction<S, T extends t.Node> = (
  this: S,
  path: NodePath<T>,
  state: S,
  captures: object,
) => void;

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
  fromCapture: compileFromCapture,
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
): string | null {
  ctx.captures.set(schema.name, schema.schema);
  const checks = compileSchema(schema.schema, input, ctx);
  if (checks === null) {
    return `(captures['${schema.name}'] = ${input}, true)`;
  } else {
    return `${checks} && (captures['${schema.name}'] = ${input}, true)`;
  }
}

function compileFromCapture(
  schema: FromCaptureMatcher,
  input: string,
): string | null {
  return `(captures['${schema.name}'] != null && typeof captures['${schema.name}'] === 'object' ? captures['${schema.name}'].name === ${input}.name : captures['${schema.name}'] === ${input})`;
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
