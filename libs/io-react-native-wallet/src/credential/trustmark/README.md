# Credential Trustmark

A credential TrustMark is a signed JWT that verifies the authenticity of a credential issued by a trusted source. It serves as proof that a credential is valid and linked to a specific wallet instance.
The TrustMark is often presented as a QR code, containing cryptographic data to ensure it hasn't been tampered with. It includes fields like issuer, issuance and expiration timestamps, and credential-specific details. TrustMarks have a short validity period and are used to enhance security and prevent misuse, such as QR code swapping.

### getCredentialTrustmark

A function that generates a signed JWT Trustmark to verify the authenticity of a digital credential. The Trustmark serves as a cryptographic proof linking a credential to a specific wallet instance, ensuring the credential's validity and preventing unauthorized modifications or misuse.

#### Signature

```typescript
function getCredentialTrustmark({
  walletInstanceAttestation: string,
  wiaCryptoContext: CryptoContext,
  credentialType: string,
  docNumber?: string,
  expirationTime?: number | string
}): Promise<{
  jwt: string,
  expirationTime: number
}>
```

#### Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| walletInstanceAttestation | string | Yes | A base64-encoded string containing the Wallet Instance Attestation (WIA). This attestation proves the authenticity of the wallet instance. |
| wiaCryptoContext | CryptoContext | Yes | The cryptographic context associated with the wallet instance. Must contain the same key pair used to generate the WIA. |
| credentialType | string | Yes | Identifier for the type of credential (e.g., "MDL" for Mobile Driver's License). |
| docNumber | string | No | The document number of the credential. If provided, it will be obfuscated in the Trustmark for privacy. |
| expirationTime | number \| string | No | Specifies when the Trustmark expires. Can be either:<br>- A timestamp in seconds<br>- A time span string (e.g., "2m" for 2 minutes)<br>Default: "2m" |

#### Return Value

Returns a Promise that resolves to an object containing:
| Property | Type | Description |
|----------|------|-------------|
| jwt | string | The signed trustmark JWT string |
| expirationTime | number | The expiration timestamp of the JWT in seconds |

## Example

```typescript
import { IoWallet } from "@pagopa/io-react-native-wallet";

const wallet = new IoWallet({ version: "1.0.0" });

// Required inputs
const walletInstanceAttestation = "base64AttestationString";
const credentialType = "MDL"; // Credential type (e.g., Mobile Driver's License)
const documentNumber = "AB123456"; // Optional document number
const cryptoContext = createCryptoContextFor("wiaKeyTag"); // Sample crypto context

// Generate the TrustMark JWT
const { jwt, expirationTime } = await wallet.Trustmark.getCredentialTrustmark({
  walletInstanceAttestation: "eyJ0eXAi...", // WIA JWT
  wiaCryptoContext: cryptoContext,
  credentialType: "IdentityCard",
  docNumber: "AB123456",
  expirationTime: "5m", // 5 minutes
});

console.log("Generated TrustMark JWT:", jwt);
console.log("Expires at:", new Date(expirationTime * 1000));
```
