# Wallet Instance Attestation

This flow consists of a single step and is used to obtain a Wallet Instance Attestation. The attestation is issued in multiple formats:
- `jwt`
- `dc+sd-jwt`
- `mso_mdoc`

The wallet provider must implement its endpoints based on the OpenAPI specification provided in the [wallet-instance.yaml](../../openapi/wallet-provider.yaml) file. In order to require a status attestation the consumer application must provide:

- `wiaCryptoContext` object that is used to sign the attestation request. The key must be generated before creating the crypto context;
- `integrityContext` object that is used to verify the integrity of the device where the app is running. The key tag must be the same used when creating the Wallet Instance;

```ts
import { IoWallet } from "@pagopa/io-react-native-wallet";

// Retrieve the integrity key tag from the store and create its context
const integrityKeyTag = "example"; // Let's assume this is the same key used when creating the Wallet Instance
const integrityContext = getIntegrityContext(integrityKeyTag);

// generate Key for Wallet Instance Attestation
// ensure the key esists befor starting the issuing process
await regenerateCryptoKey(WIA_KEYTAG); // Let's assume WI_KEYTAG is a constant string and regenerateCryptoKey is a function that regenerates the key each time it is called
const wiaCryptoContext = createCryptoContextFor(WIA_KEYTAG);

// Get env URLs
const { WALLET_PROVIDER_BASE_URL } = env; // Let's assume env is an object containing the environment variables

/**
 * Obtains a new Wallet Instance Attestation.
 * WARNING: The integrity context must be the same used when creating the Wallet Instance with the same keytag.
 */
const wallet = new IoWallet({ version: "1.0.0" });
const issuedAttestation = await wallet.WalletInstanceAttestation.getAttestation({
  wiaCryptoContext,
  integrityContext,
  walletProviderBaseUrl: WALLET_PROVIDER_BASE_URL,
  appFetch,
});
// [{ type: "wallet_app_attestation", "format": "jwt", "attestation": "ey..." }, { type: "wallet_app_attestation", "format": "dc+sd-jwt", "attestation": "ey..." }]
return issuedAttestation;
```

The returned `issuedAttestation` is supposed to be stored and used for any future operation that requires a Wallet Instance Attestation in one of the available formats. The wallet attestation has a limited validity and must be regenerated when it expires.

## Mapped results

The following errors are mapped to a `WalletProviderResponseError` with specific codes.

|HTTP Status|Error Code|Description|
|-----------|----------|-----------|
|`403 Forbidden`|`ERR_IO_WALLET_INSTANCE_REVOKED`|This response is returned by the wallet provider when the wallet instance has been revoked.|
|`404 Not Found`|`ERR_IO_WALLET_INSTANCE_NOT_FOUND`|This response is returned by the wallet provider when the wallet instance does not exist.|
|`409 Conflict`|`ERR_IO_WALLET_INSTANCE_INTEGRITY_FAILED`|This response is returned by the wallet provider when an integrity check fails.|
|`*`|`ERR_IO_WALLET_PROVIDER_GENERIC_ERROR`|This is a generic error code to map unexpected errors that occurred when interacting with the Wallet Provider.|

