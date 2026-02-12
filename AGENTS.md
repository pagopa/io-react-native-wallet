# io-react-native-wallet

High-level React Native library for IT-Wallet (EUDI Wallet) credential operations following Italian government digital identity specifications.

**Package manager:** `yarn` (never npm)
**Node:** 22.16.0

## Quick Start

```ts
import { IoWallet } from "@pagopa/io-react-native-wallet";

const wallet = new IoWallet({ version: "1.3.3" });
await wallet.WalletInstance.createWalletInstance(...);
```

## Documentation

- [Commands](docs/agents/commands.md) - Setup, build, test, lint
- [Architecture](docs/agents/architecture.md) - Multi-version support, module structure, contexts
- [Conventions](docs/agents/conventions.md) - TypeScript, testing, SDK integration, error handling
- [Flows](docs/agents/flows.md) - All credential flows (9 modules)
- [Testing](docs/agents/testing.md) - Test patterns and utilities
