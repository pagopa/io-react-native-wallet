# Wallet Instance

This flow handles the wallet instance lifecycle: creation and revocation. The wallet provider must implement its endpoints based on the OpenAPI specification provided in the [wallet-instance.yaml](../../openapi/wallet-provider.yaml) file.
A service that is responsible for ensuring the integrity of the device where the app is running is required and it's supposed to use [Google Play Integrity API](https://developer.android.com/google/play/integrity/overview) and [Key Attestation](https://developer.android.com/privacy-and-security/security-key-attestation) on Android, [DCAppAttestService](https://developer.apple.com/documentation/devicecheck/establishing-your-app-s-integrity) on iOS.
The suggested way to implement this service is to use [io-react-native-integrity](https://github.com/pagopa/io-react-native-integrity) by providing an [IntegrityContext](../utils/integrity.ts) object.

The following methods are available:
- `createWalletInstance` creates a new wallet instance;
- `revokeCurrentWalletInstance` revokes the currently valid wallet instance of the user who made the request.

Examples are provided as follows:

### Wallet instance creation

```ts
// Get env
const { GOOGLE_CLOUD_PROJECT_NUMBER, WALLET_PROVIDER_BASE_URL } = env; // Let's assume env is an object containing the environment variables

const googleCloudProjectNumber = isAndroid
  ? GOOGLE_CLOUD_PROJECT_NUMBER
  : undefined;

await ensureIntegrityServiceIsReady(googleCloudProjectNumber); // Required by io-react-native-integrity to ensure the service is ready
const integrityKeyTag = await generateIntegrityHardwareKeyTag();
const integrityContext = getIntegrityContext(integrityKeyTag); // This function is supposed to return an object as required by IntegrityContext.

await WalletInstance.createWalletInstance({
  integrityContext,
  walletProviderBaseUrl: WALLET_PROVIDER_BASE_URL,
  appFetch,
});

return integrityKeyTag;
```

The returned `integrityKeyTag` is supposed to be stored and used to verify the integrity of the device in the future when using an `IntegrityContext` object. It must be regenerated if another wallet instance is created.

### Wallet instance revocation

```ts
const { WALLET_PROVIDER_BASE_URL } = env;

await WalletInstance.revokeCurrentWalletInstance({
  walletProviderBaseUrl: WALLET_PROVIDER_BASE_URL,
  appFetch,
});
```

## Mapped results

### 409 Conflict (WalletInstanceCreationIntegrityError)

A `409 Conflict` response is returned by the wallet provider when an integrity check fails.
