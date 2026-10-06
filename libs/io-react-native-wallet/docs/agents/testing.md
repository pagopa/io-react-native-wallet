# Testing

## Commands

```bash
pnpm nx run io-react-native-wallet:test   # Run all tests (from repo root; generates the API client first)
```

From `libs/io-react-native-wallet` (requires the generated client, see [Commands](commands.md)):

```bash
pnpm exec jest path/to/file.test.ts          # Single test file
pnpm exec jest -t "test name pattern"        # Tests matching a pattern
```

## Structure

- Tests are co-located in `__tests__/` directories next to the source files
- Each numbered step file (e.g., `02-start-user-authorization.ts`) typically has a corresponding test file
- Mocks for native modules live in `__mocks__/` (library root)
- Global test setup is in `src/test-setup.ts`; Jest config in `jest.config.cts`

## Patterns

- Use `test.each` to cover multiple scenarios without repetition
- Mock external dependencies (`appFetch`, crypto modules, native modules) at the module level
- Built output (`lib/`) is excluded from the test run via `modulePathIgnorePatterns`
