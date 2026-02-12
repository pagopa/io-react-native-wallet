# Flows

The library implements 9 credential operation flows per IT-Wallet specifications. Each flow is a sequence of steps executed in order.

## Wallet Instance

**Location:** `src/wallet-instance/`
**Spec:** IT-Wallet wallet lifecycle management
**API:** `WalletInstance`

Creates and manages the device-bound wallet instance.

**Key methods:**
- `createWalletInstance()` — Registers wallet with Wallet Provider
  1. Get nonce from Wallet Provider
  2. Obtain device integrity attestation
  3. Register with provider (returns wallet instance ID)
- `revokeWalletInstance(id)` — Revokes a wallet instance
- `getWalletInstanceStatus(id)` — Get instance status by ID
- `getCurrentWalletInstanceStatus()` — Get current instance status

**Contexts:** `IntegrityContext`
**Version:** Shared common implementation (v1.0.0 = v1.3.3)
**README:** [src/wallet-instance/README.md](../../src/wallet-instance/README.md)

---

## Wallet Instance Attestation (WIA)

**Location:** `src/wallet-instance-attestation/`
**Spec:** IT-Wallet WIA (proof of wallet validity)
**API:** `WalletInstanceAttestation`

Obtains attestation tokens proving the wallet instance is valid and bound to a secure device.

**Key methods:**
- `getAttestation()` — Request WIA from Wallet Provider
  - Returns attestations in multiple formats: `jwt`, `dc+sd-jwt`, `mso_mdoc`
  - Used in PAR requests, credential requests, presentations
- `decode(wia)` — Decode WIA JWT without verification (v1.0.0 only)
- `verify(wia)` — Decode + verify WIA JWT signature (v1.0.0 only)

**Contexts:** `CryptoContext` (signing), `IntegrityContext` (device proof)
**Version:** v1.0.0 (full), v1.3.3 (partial — only `getAttestation`)
**README:** [src/wallet-instance-attestation/README.md](../../src/wallet-instance-attestation/README.md)

---

## Credential Offer

**Location:** `src/credential/offer/`
**Spec:** IT-Wallet Section 12.1.2 (User Request Flow), OpenID4VCI Section 4.1
**API:** `CredentialOffer`

Processes Credential Offers received via QR codes or deep links from Credential Issuers.

**Steps (v1.3.3):**

1. `resolveCredentialOffer(uri, { fetch })` — Parse URI + fetch offer if by-reference + validate structure
   - Supports schemes: `openid-credential-offer://`, `haip-vci://`, `https://`
   - Handles by-value (JSON in URI) and by-reference (fetch from URL)
   - Validates: HTTPS issuer, `authorization_code` grant required, `scope` required

2. `extractGrantDetails(offer)` — Extract authorization_code grant details
   - Returns: `{ grantType, authorizationCodeGrant: { scope, issuerState?, authorizationServer? } }`
   - IT-Wallet v1.3 only supports `authorization_code` (no pre-authorized code)

**Errors:** `InvalidQRCodeError`, `InvalidCredentialOfferError`
**Version:** v1.3.3 (active)
**README:** [src/credential/offer/README.md](../../src/credential/offer/README.md)

---

## Credential Issuance

**Location:** `src/credential/issuance/`
**Spec:** IT-Wallet Section 12.1.2 (Issuance Flow), OpenID4VCI
**API:** `CredentialIssuance`

Obtains credentials from a Credential Issuer using the Authorization Code flow (OID4VCI).

**Steps:**

1. `evaluateIssuerTrust()` — Fetch and verify Credential Issuer's Entity Configuration via trust chain
2. `startUserAuthorization()` — Make PAR (Pushed Authorization Request)
   - Includes WIA, DPoP proof, authorization details
   - Returns `authorization_endpoint` URL
3. `completeUserAuthorization()` — Three variants:
   - `completeUserAuthorizationWithQueryMode()` — eID (SPID/CIE strong auth)
   - `completeUserAuthorizationWithFormPostJwtMode()` — Non-eID (credential presentation)
   - `continueUserAuthorizationWithMRTDPoPChallenge()` — MRTD PoP sub-flow
   - Also: `buildAuthorizationUrl()`, `getRequestedCredentialToBePresented()`
4. `authorizeAccess()` — Exchange authorization code for access token (with DPoP)
5. `obtainCredential()` — Request credential from issuer's credential endpoint
6. `verifyAndParseCredential()` — Verify and parse obtained credential (SD-JWT or mDoc)

**Sub-module:** MRTD PoP (`src/credential/issuance/mrtd-pop/`)
- `verifyAndParseChallengeInfo()` — Parse MRTD challenge info
- `initChallenge()` — Initialize MRTD challenge
- `validateChallenge()` — Validate MRTD challenge with NFC-read data

**Contexts:** `CryptoContext` (multiple keys), `AuthorizationContext` (browser auth)
**Version:** v1.0.0 (used by v1.3.3 as well)
**README:** [src/credential/issuance/README.md](../../src/credential/issuance/README.md)

---

## Credential Presentation

**Location:** `src/credential/presentation/`
**Spec:** IT-Wallet Presentation flow, OpenID4VP
**API:** `RemotePresentation`

Presents credentials to a Relying Party (verifier).

**Steps:**

1. `startFlowFromQR(qr)` — Parse QR code → extract `request_uri`, `client_id`, `state`
2. `evaluateRelyingPartyTrust()` — Get RP's Entity Configuration + evaluate trust
3. `getRequestObject(requestUri)` — Fetch Request Object from RP
4. `getJwksFromRpConfig()` / `getJwksFromRequestObject()` — Retrieve RP JWKs for encryption
5. `verifyRequestObject()` — Validate Request Object JWT signature
6. `evaluateDcqlQuery(dcqlQuery, credentials)` — Evaluate DCQL query against wallet credentials
7. `sendAuthorizationResponse()` / `sendAuthorizationErrorResponse()` — Send encrypted VP token response to RP
   - Also: `prepareRemotePresentations()` — Prepare VPs for multiple credentials

**Errors:** `InvalidQRCodeError`, `InvalidRequestObjectError`, `CredentialsNotFoundError`, `DcqlError`, `RelyingPartyResponseError`
**Version:** v1.0.0 (used by v1.3.3 as well)
**README:** [src/credential/presentation/README.md](../../src/credential/presentation/README.md)

---

## Credential Status

**Location:** `src/credential/status/`
**Spec:** IT-Wallet credential status verification, OAuth Status Assertions
**API:** `CredentialStatus`

Checks if a credential has been revoked or suspended.

**Methods:**

- `getStatusAssertion()` — Get status assertion JWT for a credential (v1.0.0)
- `verifyAndParseStatusAssertion()` — Verify + parse status assertion (v1.0.0)
- `getStatusFromTokenStatusList()` — Token Status List approach (v1.3.3 — stub, throws `UnimplementedFeatureError`)

**Version:** v1.0.0 (full), v1.3.3 (stub)
**README:** [src/credential/status/README.md](../../src/credential/status/README.md)

---

## Trust

**Location:** `src/trust/`
**Spec:** IT-Wallet Federation, OpenID Federation
**API:** `Trust`

Validates trust chains for Credential Issuers and Relying Parties using the OpenID Federation model.

**Key methods:**

- `getTrustAnchorEntityConfiguration()` — Fetch Trust Anchor's Entity Configuration
- `buildTrustChain(leafEntityId, trustAnchor)` — Build trust chain from leaf to Trust Anchor
- `verifyTrustChain(chain)` — Verify trust chain end-to-end
  - JWT signature verification
  - X.509 CRL validation
  - Optional chain renewal on failure

**Common logic:** `trust/common/build-chain.ts`, `trust/common/verify-chain.ts`
**Rich error hierarchy:** `FederationError`, `TrustChainEmptyError`, `TrustChainTokenMissingError`, `X509ValidationError`, etc.
**Version:** v1.0.0 (used by v1.3.3 as well)
**README:** [src/trust/README.md](../../src/trust/README.md)

---

## Trustmark

**Location:** `src/credential/trustmark/`
**Spec:** IT-Wallet trustmark generation
**API:** `Trustmark`

Generates signed JWT Trustmarks that verify credential authenticity. Typically rendered as QR codes. Short-lived (default 2 minutes).

**Key method:**

- `getCredentialTrustmark(credential, options)` — Generate signed Trustmark JWT
  - Contains credential type, optional obfuscated document number, expiration
  - Signed with credential's bound key

**Version:** v1.0.0 (full), v1.3.3 (full)
**README:** [src/credential/trustmark/README.md](../../src/credential/trustmark/README.md)

---

## Credentials Catalogue

**Location:** `src/credentials-catalogue/`
**Spec:** IT-Wallet Digital Credential Catalogue
**API:** `CredentialsCatalogue`

Fetches and parses the Digital Credential Catalogue from the Trust Anchor. The catalogue contains all available credential types with their metadata, issuers, formats, claims, etc.

**Key method:**

- `fetchAndParseCatalogue(trustAnchorUrl, { fetch })` — Fetch catalogue JWT + verify signature + return parsed `DigitalCredentialsCatalogue`

**Version:** v1.0.0 (full), v1.3.3 (full)
**README:** [src/credentials-catalogue/README.md](../../src/credentials-catalogue/README.md)

---

## Supporting Modules

### SD-JWT (`src/sd-jwt/`)

Low-level SD-JWT (Selective Disclosure JWT for Verifiable Credentials) processing. **Not versioned** — shared across all versions.

**Key functions:**
- `decode(token)` — Parse SD-JWT into JWT + disclosures (no signature verification)
- `verify(token, publicKey)` — Decode + verify signature + disclosure integrity
- `disclose(token, disclosures)` — Select specific disclosures from token
- `prepareVpToken(options)` — Prepare VP token with Key Binding JWT

### mDoc (`src/mdoc/`)

Low-level mDoc/CBOR credential processing using `@pagopa/io-react-native-iso18013`.

**Key function:**
- `verify(issuerSigned)` — Decode CBOR, verify X.509 certificate chain, verify COSE-Sign1 signature

### PID (`src/pid/`)

Personal Identification Data (Italian eID) handling. Wraps SD-JWT for PID-specific parsing.

**Key functions:**
- `decode(pidToken)` — Decode SD-JWT into typed PID object
- `verify(pidToken, publicKey)` — Decode + verify signature

Exports the `PID` type.

---

## Ecosystem Flow

Typical credential lifecycle:

```
1. WalletInstance.createWalletInstance()
2. WalletInstanceAttestation.getAttestation()
3. CredentialOffer.resolveCredentialOffer() + extractGrantDetails()
   OR
   CredentialsCatalogue.fetchAndParseCatalogue() (discover types)
4. Trust.buildTrustChain() + verifyTrustChain() (verify issuer)
5. CredentialIssuance.* (full 6-step issuance)
6. CredentialStatus.getStatusAssertion() (check validity)
7. RemotePresentation.* (present to RP)
8. Trustmark.getCredentialTrustmark() (generate QR-presentable proof)
```

Each flow's README contains sequence diagrams, parameter tables, and code examples.
