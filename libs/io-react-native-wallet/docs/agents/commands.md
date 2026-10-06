# Commands

Run from the repository root unless noted. Nx project name: `@io-app-it-wallet/io-react-native-wallet` (short: `io-react-native-wallet`).

## Setup

```bash
corepack enable
pnpm install            # Install all workspace dependencies (lib + example app)
```

## Code Generation

```bash
pnpm nx run io-react-native-wallet:generate   # Regenerate the wallet-provider API client from OpenAPI spec
```

Output (`src/client/generated/wallet-provider.ts`) is gitignored. `typecheck`, `lint` and `test` depend on `generate`, so Nx runs it automatically; run it manually after modifying `openapi/wallet-provider.yaml` if you use tools outside Nx.

## Quality Checks

```bash
pnpm nx run io-react-native-wallet:lint        # ESLint
pnpm nx run io-react-native-wallet:typecheck   # TypeScript type-check (lib + specs)
pnpm nx run io-react-native-wallet:test        # Jest
pnpm validate                                  # test + lint + typecheck on affected projects (what CI runs)
pnpm validate-all                              # test + lint + typecheck on every project
```

## Building

```bash
pnpm --filter @io-app-it-wallet/io-react-native-wallet prepack   # bob build → lib/ (commonjs, module, typescript)
```

## Example App

```bash
pnpm nx run example-app:start         # Expo dev server
pnpm nx run example-app:run-ios
pnpm nx run example-app:run-android
```

## Release

```bash
pnpm --filter @io-app-it-wallet/io-react-native-wallet release   # Bump version, update changelog, create GitHub release
```

Creating the GitHub release triggers `.github/workflows/publish-io-react-native-wallet.yaml`, which publishes as `@pagopa/io-react-native-wallet`.
