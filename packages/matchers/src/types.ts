import type * as t from '@babel/types';

type ExcludedNodeKeys =
  | 'type'
  | 'extra'
  | 'start'
  | 'end'
  | 'loc'
  | 'range'
  | 'trailingComments'
  | 'leadingComments'
  | 'innerComments';

export type NodeSchema<T extends t.Node> = {
  type: T['type'];
} & {
  [K in Exclude<keyof T, ExcludedNodeKeys>]?: Schema<T[K]> | undefined;
};

export type OrMatcher<T> = {
  type: 'or';
  schema: T;
};
export type ArraySchema<T> = {
  type: 'arrayOf';
  schema: T;
};
export type NullableSchema<T> = {
  type: 'nullable';
  schema: T;
};
export type CaptureMatcher<T> = {
  type: 'capture';
  schema: T | undefined;
  name: string;
};
export type FromCaptureMatcher = {
  type: 'fromCapture';
  name: string;
};
export type PredicateMatcher<T> = (input: T) => boolean;

export type Matcher<T> =
  | OrMatcher<T>
  | ArraySchema<T>
  | NullableSchema<T>
  | CaptureMatcher<T>
  | FromCaptureMatcher;
// | PredicateMatcher<T>;

export type Schema<T> =
  | (T extends (infer U)[]
      ? Schema<U>[]
      : {
          [K in keyof T]?: Schema<T[K]>;
        })
  | T
  | undefined
  | Matcher<T>;

export type Infer<T> =
  T extends NullableSchema<infer U>
    ? U | null
    : T extends ArraySchema<infer U>
      ? U[]
      : T extends OrMatcher<infer U>
        ? U
        : T extends CaptureMatcher<infer U>
          ? U
          : T extends FromCaptureMatcher
            ? t.Identifier
            : T;

export const any = undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function or<const T extends Schema<any>[]>(
  ...schema: T
): OrMatcher<Infer<T[number]>> {
  return { type: 'or', schema } as never;
}

export function arrayOf<T>(schema: Schema<T>): ArraySchema<T> {
  return { type: 'arrayOf', schema } as never;
}

export function nullable<T>(schema: Schema<T>): NullableSchema<T> {
  return { type: 'nullable', schema } as never;
}

export function capture<T>(
  name: string,
  schema?: Schema<T>,
): CaptureMatcher<T> {
  return { type: 'capture', schema, name } as never;
}

// TODO: typed
export function fromCapture(name: string): FromCaptureMatcher {
  return { type: 'fromCapture', name };
}
