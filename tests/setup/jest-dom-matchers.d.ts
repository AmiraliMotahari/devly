/**
 * jest-dom matcher types.
 *
 * @testing-library/jest-dom v7 augments the `vitest` module with a
 * single-type-parameter `Assertion`, but Vitest 5 declares
 * `Assertion<R, T>` — the declarations don't merge and the matchers never
 * type-check. Re-declare the interface with Vitest 5's signature.
 */
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

declare module "vitest" {
  /* eslint-disable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
  interface Assertion<R extends void | Promise<void> = void, T = unknown>
    extends TestingLibraryMatchers<any, T> {}
  /* eslint-enable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
}
