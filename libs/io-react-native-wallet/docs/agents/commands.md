# Commands

## Setup

```bash
yarn install            # Install root dependencies
yarn bootstrap          # Install root + example app dependencies
```

## Building

```bash
yarn prepack            # Generate API client + build lib (commonjs, module, typescript)
```

## Code Generation

```bash
yarn generate           # Regenerate the wallet-provider API client from OpenAPI spec
```

Run after modifying `openapi/wallet-provider.yaml`.

## Quality Checks

```bash
yarn lint               # ESLint
yarn tsc                # TypeScript type-check (no emit)
yarn code-review        # generate + lint + tsc + test (full pre-PR check)
```

## Testing

```bash
yarn test               # Run all tests
jest path/to/file.test.ts   # Single test file
```

## Release

```bash
yarn release            # Bump version, update changelog, create GitHub release
```
