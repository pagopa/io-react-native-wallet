# Wallet Instance

This flow handles the wallet instance lifecycle: creation and revocation. The wallet provider must implement its endpoints based on the OpenAPI specification provided in the [wallet-instance.yaml](../../openapi/wallet-provider.yaml) file.
A service that is responsible for ensuring the integrity of the device where the app is running is required and it's supposed to use [Google Play Integrity API](https://developer.android.com/google/play/integrity/overview) and [Key Attestation](https://developer.android.com/privacy-and-security/security-key-attestation) on Android, [DCAppAttestService](https://developer.apple.com/documentation/devicecheck/establishing-your-app-s-integrity) on iOS.
The suggested way to implement this service is to use [io-react-native-integrity](https://github.com/pagopa/io-react-native-integrity) by providing an [IntegrityContext](../utils/integrity.ts) object.

The following methods are available:
- `createWalletInstance` creates a new wallet instance;
- `revokeWalletInstance` revokes a wallet instance by ID;
- `getWalletInstanceStatus` fetches the status of a wallet instance by ID without the need to require an attestation.

Examples are provided as follows:

### Wallet instance creation

```ts
const wallet = new IoWallet({ version: "1.0.0" });
// Get env
const { GOOGLE_CLOUD_PROJECT_NUMBER, WALLET_PROVIDER_BASE_URL } = env; // Let's assume env is an object containing the environment variables

const googleCloudProjectNumber = isAndroid
  ? GOOGLE_CLOUD_PROJECT_NUMBER
  : undefined;

await ensureIntegrityServiceIsReady(googleCloudProjectNumber); // Required by io-react-native-integrity to ensure the service is ready
const integrityKeyTag = await generateIntegrityHardwareKeyTag();
const integrityContext = getIntegrityContext(integrityKeyTag); // This function is supposed to return an object as required by IntegrityContext.

await wallet.WalletInstance.createWalletInstance({
  integrityContext,
  walletProviderBaseUrl: WALLET_PROVIDER_BASE_URL,
  appFetch,
});

return integrityKeyTag;
```

The returned `integrityKeyTag` is supposed to be stored and used to verify the integrity of the device in the future when using an `IntegrityContext` object. It must be regenerated if another wallet instance is created.

### Wallet Instance revocation

Revoke a Wallet Instance by ID. The ID matches the hardware/integrity key tag used for creation.

```ts
const wallet = new IoWallet({ version: "1.0.0" });
const { WALLET_PROVIDER_BASE_URL } = env;

await wallet.WalletInstance.revokeWalletInstance({
  id: "495e5bec-b93f-4fd7-952a-94b27233abdb"
  walletProviderBaseUrl: WALLET_PROVIDER_BASE_URL,
  appFetch,
});

```
### Wallet Instance status

Get the status of a Wallet Instance by ID. The ID matches the hardware/integrity key tag used for creation.

```ts
const wallet = new IoWallet({ version: "1.0.0" });
const { WALLET_PROVIDER_BASE_URL } = env;

const status = await wallet.WalletInstance.getWalletInstanceStatus({
  id: "495e5bec-b93f-4fd7-952a-94b27233abdb"
  walletProviderBaseUrl: WALLET_PROVIDER_BASE_URL,
  appFetch,
});
```

## Mapped results

The following errors are mapped to a `WalletProviderResponseError` with specific codes.

|HTTP Status|Error Code|Description|
|-----------|----------|-----------|
|`409 Conflict`|`ERR_IO_WALLET_INSTANCE_INTEGRITY_FAILED`|This response is returned by the wallet provider when an integrity check fails.|
|`*`|`ERR_IO_WALLET_PROVIDER_GENERIC_ERROR`|This is a generic error code to map unexpected errors that occurred when interacting with the Wallet Provider.|
