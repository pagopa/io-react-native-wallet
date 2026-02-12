# Testing

## Commands

```bash
yarn test       # Run all tests
yarn test:dev   # Run tests without coverage (faster)
yarn tsc        # TypeScript type check
yarn lint       # ESLint + Prettier
```

## Single Test File

```bash
jest path/to/file.test.ts
jest -t "test name pattern"
```

## Test Structure

Tests live in `__tests__/` directories co-located with implementation:

```
src/credential/offer/
├── v1.3.3/
│   ├── 01-resolve-credential-offer.ts
│   ├── 02-extract-grant-details.ts
│   └── __tests__/
│       ├── 01-resolve-credential-offer.test.ts
│       └── 02-extract-grant-details.test.ts
```

Approximately **35 test suites** with **~193 tests** across the codebase.

## Global Test Setup

**File:** `jestSetup.js`

Mocks:
- `uuid` → Returns `"mocked-uuid"` deterministically
- `@pagopa/io-react-native-iso18013` → Mocks CBOR/COSE for Node.js testing

## Common Patterns

### 1. Mock fetch for HTTP tests

```ts
const mockFetch = jest.fn();
const context = { appFetch: mockFetch };

mockFetch.mockResolvedValueOnce({
  status: 200,
  json: () => Promise.resolve(validData),
});

const result = await fetchCredentialOffer(uri, context);

expect(mockFetch).toHaveBeenCalledWith(uri, {
  method: "GET",
  headers: { Accept: "application/json" },
});
```

### 2. Mock SDK modules

**Mock functions, not error classes**:

```ts
const mockResolveCredentialOffer = jest.fn();

jest.mock("@pagopa/io-wallet-oid4vci", () => ({
  resolveCredentialOffer: (...args: unknown[]) =>
    mockResolveCredentialOffer(...args),
  CredentialOfferError: jest.requireActual("@pagopa/io-wallet-oid4vci")
    .CredentialOfferError,
}));

describe("resolveCredentialOffer", () => {
  beforeEach(() => {
    mockResolveCredentialOffer.mockReset();
  });

  it("should resolve by-value offer", async () => {
    mockResolveCredentialOffer.mockResolvedValue(validOffer);
    const result = await resolveCredentialOffer(uri);
    expect(result).toEqual(validOffer);
  });
});
```

### 3. Error class testing

```ts
it("should throw InvalidQRCodeError when SDK throws CredentialOfferError", async () => {
  const { CredentialOfferError } = jest.requireActual("@pagopa/io-wallet-oid4vci");
  mockResolveCredentialOffer.mockRejectedValue(
    new CredentialOfferError("Unsupported scheme")
  );

  await expect(resolveCredentialOffer("http://invalid")).rejects.toThrow(
    InvalidQRCodeError
  );
});
```

### 4. Verify SDK calls

```ts
expect(mockResolveCredentialOffer).toHaveBeenCalledWith({
  credentialOffer: uri,
  callbacks: { fetch: expect.any(Function) },
});
```

### 5. Test both success and error paths

```ts
describe("fetchCredentialOffer", () => {
  it("should fetch and validate valid offer", async () => {
    mockFetch.mockResolvedValueOnce({ status: 200, json: () => Promise.resolve(validOffer) });
    const result = await fetchCredentialOffer(uri, { appFetch: mockFetch });
    expect(result).toEqual(validOffer);
  });

  it("should throw IssuerResponseError on non-200 status", async () => {
    mockFetch.mockResolvedValueOnce({ status: 404 });
    await expect(fetchCredentialOffer(uri, { appFetch: mockFetch })).rejects.toThrow(
      IssuerResponseError
    );
  });

  it("should throw InvalidCredentialOfferError on invalid schema", async () => {
    const invalidOffer = { ...validOffer, credential_configuration_ids: "wrong" };
    mockFetch.mockResolvedValueOnce({ status: 200, json: () => Promise.resolve(invalidOffer) });
    await expect(fetchCredentialOffer(uri, { appFetch: mockFetch })).rejects.toThrow(
      InvalidCredentialOfferError
    );
  });
});
```

### 6. Token-based tests

For WIA, JWT, SD-JWT tests, use real encoded tokens and verify structure:

```ts
const validWiaJwt = "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9..."; // Real JWT

it("should decode WIA JWT", async () => {
  const decoded = await decode(validWiaJwt);
  expect(decoded.iss).toBe("https://wallet-provider.example.com");
  expect(decoded.cnf.jwk).toBeDefined();
});
```

### 7. Reset mocks in beforeEach

```ts
describe("myFunction", () => {
  beforeEach(() => {
    mockSdkFunction.mockReset();
  });

  it("test 1", () => { /* ... */ });
  it("test 2", () => { /* ... */ });
});
```

### 8. Descriptive test names

```ts
// Good
it("should throw InvalidQRCodeError when SDK throws CredentialOfferError", () => {});
it("should resolve by-reference offer and validate", () => {});
it("should default authorization_server to credential_issuer when undefined", () => {});

// Bad
it("works", () => {});
it("test error", () => {});
```

## Test Data

### Valid fixtures

Define valid test data at the top of test files:

```ts
const validCredentialOffer: CredentialOffer = {
  credential_issuer: "https://issuer.example.com",
  credential_configuration_ids: ["org.iso.18013.5.1.mDL"],
  grants: {
    authorization_code: {
      scope: "test-scope",
      issuer_state: "some-issuer-state",
      authorization_server: "https://auth.example.com",
    },
  },
};
```

### Invalid fixtures

Test validation by mutating valid data:

```ts
const invalidOffer = {
  ...validCredentialOffer,
  credential_issuer: "not-a-url", // Invalid
};
```

## Coverage

Run with coverage:

```bash
yarn test  # Includes coverage by default
```

Coverage reports in `coverage/` directory (gitignored).

## Utilities

The library includes utilities in `src/utils/` that are testable:

- `src/utils/errors.ts` — Error classes
- `src/utils/mappers.ts` — `createMapper`, `withMapper`
- `src/utils/misc.ts` — `hasStatusOrThrow`, `generateRandomAlphaNumericString`, etc.
- `src/utils/dpop.ts` — `createDPopToken`
- `src/utils/pop.ts` — `createPopToken`
- `src/utils/crypto.ts` — `createCryptoContextFor`, `withEphemeralKey`

These utilities have tests in `src/utils/__tests__/`.

## Running Example App Tests

The example app (`example/`) has its own test suite:

```bash
cd example
yarn test
```
