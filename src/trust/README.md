# Trust Chain Validation

This module implements **Trust Chain validation** for Entity Configurations and Entity Statements in line with the [IT Wallet Federation Specifications](https://italia.github.io/eid-wallet-it-docs/). It ensures that an entity's metadata is trusted by validating a chain of signed JWTs up to a known Trust Anchor.

The validation covers:

* JWT signature verification (using the next entity's JWKS)
* Trust chain ordering (leaf → parent → Trust Anchor)
* Optional X.509 CRL-based certificate validation

## Sequence Diagram

```mermaid
sequenceDiagram
  autonumber
  participant A as Leaf Entity
  participant B as Intermediate (Federation Authority)
  participant C as Trust Anchor

  A->>A: Self-issued Entity Configuration (JWT)
  B->>A: Signed Entity Statement (JWT)
  C->>B: Signed Entity Statement (JWT or self-issued EC)

  Note over A,C: Each JWT is validated with the next issuer's public keys
```

## Errors

| Error                         | Description                                                        |
| ----------------------------- | ------------------------------------------------------------------ |
| `TrustChainEmptyError`        | The input chain is empty.                                          |
| `TrustChainTokenMissingError` | One of the JWTs in the chain is missing.                           |
| `X509ValidationError`         | X.509 certificate validation failed (e.g. revocation, expiration). |
| `FederationError`             | Generic federation processing error.                               |

## Usage

### Validate a trust chain

```ts
import { validateTrustChain } from "./trust";
import { trustAnchorEntityConfiguration } from "./your-data";
import { chain } from "./your-data"; // array of JWTs, starting from leaf

const result = await validateTrustChain(trustAnchorEntityConfiguration, chain, {
  connectTimeout: 3000,
  readTimeout: 3000,
  requireCrl: false,
});
```

* The `chain` must be an array of signed JWT strings.
* The first JWT must be a self-issued `EntityConfiguration`.
* The last JWT must be an `EntityStatement` or a self-issued Trust Anchor `EntityConfiguration`.

### Renew a trust chain

```ts
import { renewTrustChain } from "./trust";

const newChain = await renewTrustChain(chain);
```

This will fetch updated JWTs from each authority in the chain.

## Trust Chain Structure

| Position | JWT Type                            | Requirements                     |
| -------- | ----------------------------------- | -------------------------------- |
| First    | Entity Configuration                | `iss === sub` (self-issued)      |
| Middle   | Entity Statement                    | `iss ≠ sub`, signed by parent    |
| Last     | Entity Statement or Trust Anchor EC | Trust Anchor must be known |

## Example Trust Chain

```ts
[
  {
    header: { alg: "ES256", kid: "leaf-kid" },
    payload: { iss: "https://leaf", sub: "https://leaf", jwks: { keys: [...] } }
  },
  {
    header: { alg: "ES256", kid: "intermediate-kid" },
    payload: { iss: "https://intermediate", sub: "https://leaf", jwks: { keys: [...] } }
  },
  {
    header: { alg: "ES256", kid: "ta-kid" },
    payload: { iss: "https://ta", sub: "https://ta", jwks: { keys: [...] } }
  }
]
```

## Mocking in Tests

If you're testing in Node (not in React Native), you need to mock X.509 and crypto-native dependencies:

```ts
jest.mock("@pagopa/io-react-native-crypto", () => ({
  verifyCertificateChain: jest.fn().mockResolvedValue({
    isValid: true,
    validationStatus: "VALID",
    errorMessage: undefined,
  }),
  generate: jest.fn().mockResolvedValue({ ... }),
}));
```

Ensure mocked `JWK`s contain an `x5c` array to trigger certificate validation logic during tests.
