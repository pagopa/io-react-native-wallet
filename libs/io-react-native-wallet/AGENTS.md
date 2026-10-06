# IO React Native Wallet

TypeScript library implementing the EUDI Wallet / IT-Wallet specifications for React Native. Provides data structures, helpers and API for credential issuance, presentation, and wallet lifecycle management.

Part of an Nx + pnpm monorepo: this library lives in `libs/io-react-native-wallet`, the example app in `apps/example-app`.

**Package manager:** `pnpm` via Corepack (not npm/yarn). Node version from the root `.node-version`.

## Documentation

- [Commands](docs/agents/commands.md) - Build, test, lint, generate
- [Architecture](docs/agents/architecture.md) - SDK structure, versioning, module layout
- [Conventions](docs/agents/conventions.md) - TypeScript patterns, error handling, crypto contexts
- [Testing](docs/agents/testing.md) - Test commands and structure

## Plan Mode

- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.
- Keep asking me questions until you have at least 90% understanding of the plan