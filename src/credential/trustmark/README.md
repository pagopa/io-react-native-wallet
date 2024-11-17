# Credential Trustmark

A credential TrustMark is a signed JWT that verifies the authenticity of a credential issued by a trusted source. It serves as proof that a credential is valid and linked to a specific wallet instance.
The TrustMark is often presented as a QR code, containing cryptographic data to ensure it hasn't been tampered with. It includes fields like issuer, issuance and expiration timestamps, and credential-specific details. TrustMarks have a short validity period and are used to enhance security and prevent misuse, such as QR code swapping.

## Example

```typescript
// Required inputs
const walletInstanceAttestation = "base64AttestationString";
const credentialType = "MDL"; // Credential type (e.g., Mobile Driver's License)
const documentNumber = "AB123456"; // Optional document number
const cryptoContext = createCryptoContextFor("wiaKeyTag"); // Sample crypto context

// Generate the TrustMark JWT
const trustmarkJwt = await getCredentialTrustmarkJwt(
  walletInstanceAttestation,
  cryptoContext,
  credentialType,
  documentNumber
);

console.log("Generated TrustMark JWT:", trustmarkJwt);
```
