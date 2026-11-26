# Expo Integrity

Expo module for Android Play Integrity and hardware key attestation, and iOS
App Attest. Import the functions from `@io-app-it-wallet/expo-integrity`. A
custom development build is required; Expo Go does not include this module.

The API retains `isPlayServicesAvailable`, `prepareIntegrityToken`,
`requestIntegrityToken`, `isAttestationServiceAvailable`,
`generateHardwareKey`, `getAttestation` and
`generateHardwareSignatureWithAssertion`. Native errors are rejected with
`{ message, userInfo }`, where `message` is an integrity error code.

On Android, enable Play Integrity for the application in Google Play, obtain
the Google Cloud project number and call `prepareIntegrityToken` before
requesting a token. `getAttestation` creates a hardware-backed key using the
provided alias, which must not already exist. Its result is a base64-encoded
comma-separated list of base64 certificates.

On iOS, enable the App Attest capability and use the appropriate
`com.apple.developer.devicecheck.appattest-environment` entitlement and
provisioning profile. Generate a key before attesting it; an App Attest key
can only be attested once. The result and the assertion are base64-encoded
Apple CBOR objects.

Use fresh server-provided challenges and verify attestations, assertions and
integrity tokens on a trusted backend. The example screen generates values
but does not perform backend verification.
