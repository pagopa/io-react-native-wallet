# Architecture

## Overview

This is a **React Native library** (not an app). The public API is exported from `src/index.ts` and built into `lib/` via `react-native-builder-bob`.

The main entrypoint is the `IoWallet` class in `src/IoWallet.ts`, which is instantiated with a specific IT-Wallet spec version and exposes all feature namespaces.

```ts
const wallet = new IoWallet({ version: "1.0.0" });
wallet.CredentialIssuance.evaluateIssuerTrust(...)
wallet.WalletInstance.createWalletInstance(...)
```

## Versioning

The library supports multiple IT-Wallet specification versions (`1.0.0`, `1.3.3`). Each feature module provides per-version implementations:

```
src/<feature>/
├── api/            # Shared API types and contracts
├── common/         # Shared logic across versions
├── v1.0.0/         # v1.0.0 implementation
├── v1.3.3/         # v1.3.3 implementation
└── index.ts        # Exports V1_0_0 and V1_3_3 named implementations
```

Version dispatch happens in `src/api/index.ts` via `ioWalletApiByVersion`.

## Feature Modules

| Module | Namespace on `IoWallet` | Description |
|---|---|---|
| `wallet-instance` | `WalletInstance` | Create, revoke, and check wallet instance status |
| `wallet-instance-attestation` | `WalletInstanceAttestation` | Obtain a Wallet Instance Attestation (WIA) |
| `trust` | `Trust` | Evaluate trust chains and entity configurations |
| `credential/issuance` | `CredentialIssuance` | Full OID4VCI credential issuance flow |
| `credential/offer` | `CredentialsOffer` | Resolve and parse credential offers |
| `credential/status` | `CredentialStatus` | Check credential validity via status assertions |
| `credential/presentation` | `RemotePresentation` | OID4VP remote presentation flow |
| `credential/trustmark` | `Trustmark` | Get credential trustmarks |
| `credentials-catalogue` | `CredentialsCatalogue` | Fetch supported credentials catalogue |

## Credential Issuance Flow

The issuance flow is sequential and step-numbered within each version folder:

```
01-evaluate-issuer-trust.ts
02-start-user-authorization.ts
03-complete-user-authorization.ts   # branches for eID vs credential
04-authorize-access.ts
05-obtain-credential.ts
06-verify-and-parse-credential.ts
```

See `src/credential/issuance/README.md` for full sequence diagram.

## Utility Modules

Located in `src/utils/`:

- `crypto.ts` — `createCryptoContextFor(keytag)`, `withEphemeralKey()`
- `errors.ts` — Error class hierarchy (`IoWalletError`, `UnexpectedStatusCodeError`, etc.)
- `logging.ts` — `Logger` singleton with pluggable `LoggingContext`
- `dpop.ts` — DPoP proof generation
- `integrity.ts` — `IntegrityContext` type
- `auth.ts` — `AuthorizationContext` type

## Generated Code

`src/client/generated/wallet-provider.ts` is auto-generated from `openapi/wallet-provider.yaml` using `typed-openapi`. Never edit it manually; run `yarn generate` instead.
