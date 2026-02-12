# Code Conventions

## TypeScript

- Prefer string literal unions over `enum`: `type GrantType = "authorization_code" | "pre-authorized_code"`
- Use `type` for simple aliases, `interface` for extensible objects
- Avoid `fp-ts` — use standard TypeScript (null checks, try/catch, native array methods)
- Use Zod for runtime validation of external data (API responses, QR codes, JWT payloads)

## Naming

- `camelCase` for files and variables
- `PascalCase` for types, interfaces, classes
- `UPPER_SNAKE_CASE` for constants
- Sequential numbering for flow steps: `01-resolve-credential-offer.ts`, `02-extract-grant-details.ts`

## File Organization

- Max ~200 lines per file
- One function per flow step file (e.g., `01-resolve-credential-offer.ts` exports one function)
- Extract complex logic into `utils.ts`, `mappers.ts`, or `helpers.ts`
- Group related types in `types.ts` (avoid when SDK exports suffice)
- Co-locate tests in `__tests__/` next to implementation

## Error Handling

### Prefer .catch() over try/catch

```ts
// Good
const result = await sdkFunction().catch((e) => {
  if (e instanceof SdkError) {
    throw new LibraryError(e.message);
  }
  throw e;
});

// Avoid
try {
  const result = await sdkFunction();
} catch (e) {
  // ...
}
```

### Use withMappedErrors for sync SDK calls

```ts
const withMappedErrors = <T>(fn: () => T): T => {
  try {
    return fn();
  } catch (e) {
    if (e instanceof CredentialOfferError) {
      throw new InvalidCredentialOfferError(e.message);
    }
    throw e;
  }
};

export const extractGrantDetails = (offer) =>
  withMappedErrors(() => sdkExtractGrantDetails(offer));
```

### Error Mapping Pattern

Map SDK errors to library-specific error classes:

| SDK Error | Library Error | When |
|-----------|---------------|------|
| `CredentialOfferError` | `InvalidQRCodeError` | URI parsing, fetching |
| `CredentialOfferError` | `InvalidCredentialOfferError` | Validation |
| HTTP 4xx/5xx | `IssuerResponseError` | Issuer API failures |
| HTTP 4xx/5xx | `WalletProviderResponseError` | Wallet Provider API failures |
| HTTP 4xx/5xx | `RelyingPartyResponseError` | RP API failures |

All library errors extend `IoWalletError` (base class in `src/utils/errors.ts`).

## SDK Integration

### Never cast types

```ts
// Bad
const offer = data as unknown as CredentialOffer;

// Good - use explicit mapper
const toCredentialOffer = (data: unknown): CredentialOffer => {
  const result = CredentialOfferSchema.safeParse(data);
  if (!result.success) {
    throw new InvalidCredentialOfferError(result.error.message);
  }
  return result.data;
};
```

### SDK types are authoritative

Use SDK types in API signatures when available:

```ts
import type { CredentialOffer, ExtractGrantDetailsResult } from "@pagopa/io-wallet-oid4vci";

export interface ExtractGrantDetailsApi {
  extractGrantDetails(offer: CredentialOffer): ExtractGrantDetailsResult;
}
```

Only define local types when SDK doesn't export them.

### Delegate to SDK, map errors

```ts
import {
  resolveCredentialOffer as sdkResolveCredentialOffer,
  CredentialOfferError,
} from "@pagopa/io-wallet-oid4vci";

const resolved = await sdkResolveCredentialOffer({
  credentialOffer,
  callbacks: { fetch: fetchFn },
}).catch((e: unknown) => {
  if (e instanceof CredentialOfferError) {
    throw new InvalidQRCodeError(e.message);
  }
  throw e;
});
```

## Comments

### API files — generic, version-agnostic

API interfaces describe **what** the function does, not **how** (implementation details) or **which version-specific rules** apply.

```ts
/**
 * Resolve and validate a Credential Offer received via QR code or deep link.
 *
 * @param credentialOffer - The raw URI string from the QR code or deep link.
 * @param callbacks - Optional object with a custom `fetch` implementation.
 * @returns The resolved and validated {@link CredentialOffer}.
 * @throws {InvalidQRCodeError} If the URI cannot be parsed or fetched.
 * @throws {InvalidCredentialOfferError} If the offer fails validation.
 */
```

### Version files — spec-specific details

Implementation files include **IT-Wallet spec sections**, **validation rules**, **grant type constraints**, **supported schemes**, etc.

```ts
/**
 * v1.3.3 implementation — first step of the User Request Flow
 * (IT-Wallet spec, Section 12.1.2).
 *
 * Delegates to the SDK's resolveCredentialOffer for URI parsing and
 * by-reference fetching, then to validateCredentialOffer for IT-Wallet
 * v1.3 structural checks:
 * - `credential_issuer` must be an HTTPS URL
 * - `grants` object is required
 * - `authorization_code` grant is required
 * - `scope` is required within `authorization_code`
 *
 * Supported URI schemes: openid-credential-offer://, haip-vci://, https://.
 */
```

### Inline comments for non-obvious logic

```ts
// Structural validation (no metadata cross-checks at this stage)
await validateCredentialOffer({ credentialOffer: resolved });
```

## Testing Patterns

See [Testing](./testing.md) for comprehensive test patterns and utilities.

## Multi-Version Patterns

### API Interface (version-agnostic)

```ts
// src/<module>/api/index.ts
export interface ModuleApi {
  methodName(params): Promise<Result>;
}
```

### Version Implementation

```ts
// src/<module>/v1.3.3/index.ts
import type { ModuleApi } from "../api";
import { methodName } from "./method-name";

export const Module: ModuleApi = {
  methodName,
};
```

### Version Registry

```ts
// src/api/index.ts
export const ioWalletApiByVersion: Record<ItwVersion, IoWalletApi> = {
  "1.0.0": { Module: Module.V1_0_0 },
  "1.3.3": { Module: Module.V1_3_3 },
};
```

## Type Mappers

When version-specific types differ from public API types:

```ts
import { createMapper } from "../../../utils/mappers";

export const toPublicType = createMapper<InternalType, PublicType>(
  (internal) => ({
    publicField: internal.internalField,
  })
);

// Use with withMapper
export const decode = withMapper(toPublicType, internalDecode);
```

## Zod Validation

Use Zod for:
- External API responses
- QR code/URI parsing
- JWT payload validation
- User input validation

```ts
const CredentialOfferSchema = z.object({
  credential_issuer: z.string().url(),
  credential_configuration_ids: z.array(z.string()).min(1),
  grants: z.object({
    authorization_code: z.object({
      scope: z.string(),
    }),
  }),
});

const result = CredentialOfferSchema.safeParse(data);
if (!result.success) {
  throw new InvalidCredentialOfferError(result.error.message);
}
```

## Import Rules

- Import SDK types: `import type { ... } from "@pagopa/io-wallet-oid4vci"`
- Import SDK functions: `import { fn as sdkFn } from "@pagopa/io-wallet-oid4vci"`
- Always alias SDK functions to avoid name collisions: `sdkResolveCredentialOffer`
- Import error classes separately: `import { CredentialOfferError } from "@pagopa/io-wallet-oid4vci"`
