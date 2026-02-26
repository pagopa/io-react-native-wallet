# Testing

## Commands

```bash
yarn test                        # Run all tests
jest path/to/file.test.ts        # Single test file
jest -t "test name pattern"      # Tests matching a pattern
```

## Structure

- Tests are co-located in `__tests__/` directories next to the source files
- Each numbered step file (e.g., `02-start-user-authorization.ts`) typically has a corresponding test file
- Mocks for native modules live in `__mocks__/`
- Global test setup is in `jestSetup.js`

## Patterns

- Use `test.each` to cover multiple scenarios without repetition
- Mock external dependencies (`appFetch`, crypto modules, native modules) at the module level
- The `example/` app is excluded from the test run via `modulePathIgnorePatterns`
