import type { Matcher } from '@codemod/matchers';

type MatcherType<T> = T extends Matcher<infer U> ? U : T;

declare module '@codemod/matchers' {
  // The library only implements up to 5 arguments, but we need more
  // Also have to keep the other ones because of recursive matchers (numberExpressions.ts)

  export function or(): Matcher<never>;
  export function or<T>(first: Matcher<T> | T): Matcher<T>;
  export function or<T, U>(
    first: Matcher<T> | T,
    second: Matcher<U> | U,
  ): Matcher<T | U>;
  export function or<T, U, V>(
    first: Matcher<T> | T,
    second: Matcher<U> | U,
    third: Matcher<V> | V,
  ): Matcher<T | U | V>;
  export function or<T, U, V, W>(
    first: Matcher<T> | T,
    second: Matcher<U> | U,
    third: Matcher<V> | V,
    fourth: Matcher<W> | W,
  ): Matcher<T | U | V | W>;
  export function or<T, U, V, W, X>(
    first: Matcher<T> | T,
    second: Matcher<U> | U,
    third: Matcher<V> | V,
    fourth: Matcher<W> | W,
    fifth: Matcher<X> | X,
  ): Matcher<T | U | V | W | X>;
  export function or<const T extends readonly unknown[]>(
    ...matchers: T
  ): Matcher<MatcherType<T[number]>>;
}

declare module '@codemod/matchers/build/matchers/predicate' {
  // Convenience overload for not having to cast the value when using it
  export function predicate<T>(predicate: (value: T) => boolean): Matcher<T>;
}
