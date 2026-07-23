# Key Attestation

This flow is used to obtain a [**Key Attestation**](https://italia.github.io/eid-wallet-it-docs/releases/1.4.4/en/wallet-solution-requirements.html#key-attestation-requirements) (KA). The Key Attestation is bound to one or more cryptographic keys, that must be provided by the consumer application:
- `keyAttestationCryptoContext` one or more objects that extend the `CryptoContext` with a function to generate a WSCD-stored key with an optional [Android key attestation](https://developer.android.com/privacy-and-security/security-key-attestation); these are the keys that will be attested in the KA.
- `integrityContext` object that is used to verify the integrity of the device where the app is running. The key tag must be the same used when creating the Wallet Instance.

#### Note
Before invoking `KeyAttestation`'s functions, it is necessary to check whether the feature is supported by the current IoWallet instance.
```ts
const wallet = new IoWallet({ version: "1.4.4" });

if (wallet.KeyAttestation.isSupported) {
  // Get the WUA
}
```

### Example usage

```ts
import {
  IoWallet,
  createCryptoContextFor,
  KeyAttestationCryptoContext
} from "@pagopa/io-react-native-wallet";

// Retrieve the integrity key tag from the store and create its context
const integrityKeyTag = "example"; // Let's assume this is the same key used when creating the Wallet Instance
const integrityContext = getIntegrityContext(integrityKeyTag);

// Get env URLs
const { WALLET_PROVIDER_BASE_URL } = env; // Let's assume env is an object containing the environment variables

// The list of crypto contexts for each key to attest.
const keysToAttest: KeyAttestationCryptoContext[] = [
  {
    ...createCryptoContextFor("example-keytag"),
    generateKeyWithAttestation(challenge: string) {
      // Generate a key stored in a trustworthy WSCD.
      // On Android this function must return a key attestation.
      return { 
        success: true,
        attestation: "android-key-attestation-string",
      };
    }
  }
];

/**
 * Obtain a new Key Attestation.
 * WARNING: The integrity context must be the same used when creating the Wallet Instance with the same keytag.
 */
const wallet = new IoWallet({ version: "1.4.4" });
const issuedAttestation = await wallet.KeyAttestation.getAttestation(
  {
    walletProviderBaseUrl: WALLET_PROVIDER_BASE_URL,
    walletSolutionId: "exampleId",
    walletSolutionVersion: "1.2.3",
  },
  {
    keysToAttest,
    integrityContext,
    appFetch,
  }
);
```
## Mapped results

The following errors are mapped to a `WalletProviderResponseError` with specific codes.

|HTTP Status|Error Code|Description|
|-----------|----------|-----------|
|`*`|`ERR_IO_WALLET_PROVIDER_GENERIC_ERROR`|This is a generic error code to map unexpected errors that occurred when interacting with the Wallet Provider.|

