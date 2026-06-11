type PreferNonAny<A, B> = 0 extends 1 & A ? B : A;

declare module 'isolated-vm-shared' {
  const ivm: PreferNonAny<
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    typeof import('isolated-vm-6'),
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    typeof import('isolated-vm-7')
  >;
  export default ivm;
}
