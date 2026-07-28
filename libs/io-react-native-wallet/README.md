# io-react-native-wallet

This React Native library is the main library of the IT-Wallet implementation.

## Prerequisites

Run all commands from the monorepo root through Nx.

## Regenerate the wallet-provider client from its OpenAPI specification:

This must be run every time the OpenAPI specification under `libs/io-react-native-wallet/openapi` is updated.
```sh
pnpm nx run io-react-native-wallet:generate
```