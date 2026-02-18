# Conventions

## TypeScript

- Strict mode enabled (`tsconfig.json`)
- Prefer string literal unions over `enum` for public-facing types
- Use `zod` for runtime validation of external data
- Never edit generated files in `src/client/generated/` — run `yarn generate`

## Error Handling

All errors extend `IoWalletError` from `src/utils/errors.ts`:

```ts
import { Errors } from "@pagopa/io-react-native-wallet";

// Base class for all library errors
Errors.IoWalletError

// HTTP errors with typed codes
Errors.IssuerResponseError       // from credential issuer
Errors.WalletProviderResponseError  // from wallet provider
Errors.RelyingPartyResponseError    // from relying party

// Type guards
Errors.isIssuerResponseError(err, "ERR_CREDENTIAL_INVALID_STATUS")
Errors.isWalletProviderResponseError(err)
```

Use `ResponseErrorBuilder` to map HTTP status codes to typed errors:

```ts
new ResponseErrorBuilder(IssuerResponseError)
  .handle(403, { code: "ERR_CREDENTIAL_INVALID_STATUS", message: "Forbidden" })
  .handle("*", { code: "ERR_ISSUER_GENERIC_ERROR", message: "Unexpected error" })
  .buildFrom(baseError)
```

## Crypto Contexts

Hardware-backed key operations go through `CryptoContext` from `@pagopa/io-react-native-jwt`. Create one from a keytag:

```ts
import { createCryptoContextFor } from "@pagopa/io-react-native-wallet";

const cryptoContext = createCryptoContextFor(keytag);
```

For short-lived keys use `withEphemeralKey`:

```ts
import { createCryptoContextFor } from "@pagopa/io-react-native-wallet";

const result = await withEphemeralKey(async (ephemeralContext) => {
  // key is automatically deleted after this block
});
```

## Logging

Initialize the `Logger` singleton once at app startup with your logging implementation:

```ts
import { Logging } from "@pagopa/io-react-native-wallet";

Logging.Logger.getInstance().initLogging({
  logDebug: (msg) => console.debug(msg),
  logInfo: (msg) => console.info(msg),
  logWarn: (msg) => console.warn(msg),
  logError: (msg) => console.error(msg),
});
```

## Versioning Pattern

When adding a new feature implementation for a specific spec version:

1. Create `src/<feature>/v<X.Y.Z>/` with numbered step files
2. Export the implementation as a named const matching `<FeatureApi>` type from `src/<feature>/api/`
3. Register it in `src/<feature>/index.ts` as `V<X_Y_Z>`
4. Add it to `ioWalletApiByVersion` in `src/api/index.ts`

## File Organization

- Steps within a flow are numbered (`01-`, `02-`, ...) for sequential clarity
- Tests are co-located in `__tests__/` next to the implementation files
- Common/shared logic lives in `common/` within each feature module
