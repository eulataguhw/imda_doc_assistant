/**
 * Register the jest-axe `toHaveNoViolations` matcher on vitest's Assertion so
 * `expect(results).toHaveNoViolations()` type-checks. `@types/jest-axe` augments
 * the Jest global namespace, not vitest, so we add it here. The trailing
 * `export {}` makes this file a module so the block AUGMENTS vitest rather than
 * replacing its exported API (describe/it/expect/vi).
 */
declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches vitest's own generic default
  interface Assertion<T = any> {
    toHaveNoViolations(): T;
  }
}

export {};
