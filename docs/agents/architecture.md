# Architecture

## Overview

The library is a **high-level abstraction** for IT-Wallet (EUDI Wallet) operations. It implements the [Italian government digital identity specifications](https://github.com/italia/eudi-wallet-it-docs) across multiple versions (1.0.0, 1.3.3) via a unified API.

**Entry point**: `IoWallet` class that dynamically binds version-specific implementations:

```ts
import { IoWallet } from "@pagopa/io-react-native-wallet";

const wallet = new IoWallet({ version: "1.3.3" });

// All modules available under namespaces
wallet.WalletInstance.createWalletInstance(...)
wallet.WalletInstanceAttestation.getAttestation(...)
wallet.CredentialIssuance.evaluateIssuerTrust(...)
wallet.CredentialOffer.resolveCredentialOffer(...)
wallet.RemotePresentation.startFlowFromQR(...)
wallet.CredentialStatus.getStatusAssertion(...)
wallet.Trust.buildTrustChain(...)
wallet.Trustmark.getCredentialTrustmark(...)
wallet.CredentialsCatalogue.fetchAndParseCatalogue(...)
```

## Multi-Version Support

Each module supports multiple IT-Wallet specification versions via isolated implementations:

```
src/<module>/
├── api/              # Version-agnostic interface
│   ├── index.ts      # Exports <Module>Api interface
│   ├── 01-step.ts    # Per-step interface (large modules)
│   └── types.ts      # Shared types
├── common/           # Shared across versions
│   ├── errors.ts     # Module-specific errors
│   └── utils.ts      # Shared helpers
├── v1.0.0/           # IT-Wallet v1.0.0 implementation
│   ├── index.ts      # Exports const implementing <Module>Api
│   ├── 01-step.ts    # Step implementation
│   └── __tests__/
└── v1.3.3/           # IT-Wallet v1.3.3 implementation
    ├── index.ts
    └── __tests__/
```

**Version registry** (`src/api/index.ts`):

```ts
export const ioWalletApiByVersion: Record<ItwVersion, IoWalletApi> = {
  "1.0.0": {
    WalletInstance: WalletInstance.V1_0_0,
    WalletInstanceAttestation: WalletInstanceAttestation.V1_0_0,
    // ...
  },
  "1.3.3": { /* v1.3.3 implementations */ },
};
```

Consumers are version-agnostic — the library routes to the correct implementation.

## Module Structure

### 9 Core Modules

| Module | Purpose | API namespace |
|--------|---------|---------------|
| **Wallet Instance** | Device-bound wallet creation/management | `WalletInstance` |
| **Wallet Instance Attestation** | WIA (proof of wallet validity) | `WalletInstanceAttestation` |
| **Credential Offer** | Process credential offers (QR codes) | `CredentialOffer` |
| **Credential Issuance** | Obtain credentials from issuers (OID4VCI) | `CredentialIssuance` |
| **Credential Presentation** | Present credentials to RPs (OID4VP) | `RemotePresentation` |
| **Credential Status** | Check credential validity/revocation | `CredentialStatus` |
| **Trust** | Trust chain validation (OpenID Federation) | `Trust` |
| **Trustmark** | Generate signed QR-presentable trustmarks | `Trustmark` |
| **Credentials Catalogue** | Discover available credential types | `CredentialsCatalogue` |

### Supporting Modules

- **SD-JWT** (`src/sd-jwt/`) — SD-JWT credential format handling (shared, not versioned)
- **mDoc** (`src/mdoc/`) — mDoc/CBOR credential format handling
- **PID** (`src/pid/`) — Personal ID (Italian eID) specific parsing

## SDK Delegation Pattern

The library **orchestrates flows** but **delegates primitives** to specialized SDKs.

### What SDKs Provide

| SDK | Responsibilities |
|-----|------------------|
| `@pagopa/io-react-native-jwt` | JWT signing, verification, JWE encryption, thumbprints |
| `@pagopa/io-react-native-crypto` | Native key generation, signing, key storage |
| `@pagopa/io-react-native-iso18013` | mDoc CBOR/COSE decoding and verification |
| `@pagopa/io-wallet-oid4vci` | OID4VCI credential offer parsing/validation |
| `@sd-jwt/*` | SD-JWT standard implementation |
| `dcql` | Digital Credentials Query Language evaluation |
| `jsrsasign` | X.509 certificate parsing |

### What This Library Implements

- **Flow orchestration** — Multi-step wallet lifecycle flows (creation, attestation, issuance, presentation)
- **Multi-version routing** — Dynamic dispatch to v1.0.0 vs v1.3.3 implementations
- **Error mapping** — SDK errors → library-specific error classes (`InvalidQRCodeError`, `IssuerResponseError`, etc.)
- **Trust evaluation** — Trust chain building and verification (OpenID Federation)
- **HTTP client** — Typed API client (auto-generated from OpenAPI spec)
- **Context management** — Standardized interfaces for crypto, integrity, auth, logging

## Context Pattern

The library delegates **environment-specific concerns** to the consumer application via **contexts**.

### CryptoContext

**Defined in**: `@pagopa/io-react-native-jwt`
**Purpose**: Key management and signing operations

```ts
interface CryptoContext {
  getPublicKey(): Promise<JWK>;
  getSignature(value: string): Promise<string>;
}
```

**Helper**:
```ts
import { createCryptoContextFor } from "@pagopa/io-react-native-wallet";
const ctx = createCryptoContextFor("wallet-instance-key");
```

**Used by**: WIA, PAR requests, DPoP tokens, credential binding, presentation signing

### IntegrityContext

**Purpose**: Device attestation (Google Play Integrity / Apple App Attest)

```ts
interface IntegrityContext {
  getHardwareKeyTag(): string;
  getAttestation(nonce: string): Promise<string>;
  getHardwareSignatureWithAuthData(clientData: string): Promise<HardwareSignatureWithAuthData>;
}
```

**Used by**: Wallet instance creation, WIA requests

### AuthorizationContext

**Purpose**: Browser-based user authorization (SPID/CIE for eID)

```ts
interface AuthorizationContext {
  authorize(url: string, redirectSchema: string): Promise<string>;
}
```

**Used by**: Strong authentication during eID credential issuance

### LoggingContext

**Purpose**: Custom logging implementation

```ts
interface LoggingContext {
  logDebug(msg: string): void;
  logInfo(msg: string): void;
  logWarn(msg: string): void;
  logError(msg: string): void;
}

import { Logging } from "@pagopa/io-react-native-wallet";
Logging.Logger.getInstance().initLogging(myLoggingContext);
```

### appFetch

**Pattern**: Most functions accept `appFetch?: GlobalFetch["fetch"]` for custom HTTP implementations (e.g., certificate pinning).

## Client Layer

**Auto-generated HTTP client** from OpenAPI spec (`openapi/wallet-provider.yaml`):

- `src/client/generated/wallet-provider.ts` — Typed API with Zod validation
- `src/client/index.ts` — `getWalletProviderClient()` factory with:
  - Response validation (throws `WalletProviderResponseError`)
  - URL path interpolation
  - Custom fetch support

## Example App

`example/` demonstrates full integration:

- Redux state management
- Thunks for async flow operations
- Screen-based navigation through credential flows
- Error handling with visual feedback

Run with:
```bash
cd example && yarn ios
```

## Version Implementation Status

| Module | v1.0.0 | v1.3.3 |
|--------|--------|--------|
| WalletInstance | ✅ Shared impl | ✅ Shared impl |
| WalletInstanceAttestation | ✅ Full | ⚠️ Partial (no decode/verify) |
| Trust | ✅ Full | ✅ Reuses v1.0.0 |
| CredentialIssuance | ✅ Full | ✅ Reuses v1.0.0 |
| CredentialStatus | ✅ Assertion | ⚠️ Stub (token status list) |
| RemotePresentation | ✅ Full | ✅ Reuses v1.0.0 |
| CredentialsCatalogue | ✅ Full | ✅ Full |
| Trustmark | ✅ Full | ✅ Full |
| CredentialOffer | ⚠️ Temp uses v1.3.3 | ✅ Full |

Unimplemented features throw `UnimplementedFeatureError`.
