# Credential Presentation

## Sequence Diagram

```mermaid
sequenceDiagram
      autonumber
      participant I as Individual using EUDI Wallet
      participant O as Organisational Wallet (Verifier)
      participant A as Organisational Wallet (Issuer)

      O->>+I: QR-CODE: Authorisation request (`request_uri`)
      I->>+O: GET: Request object, resolved from the `request_uri`
      O->>+I: Respond with the Request object
      I->>+O: GET: /.well-known/jar-issuer/jwk
      O->>+I: Respond with the public key

      I->>+O: POST: VP token response
      O->>+A: GET: /.well-known/jwt-vc-issuer/jwk
      A->>+O: Respond with the public key
      O->>+I: Redirect: Authorisation response
```

## Mapped results

## Examples

<details>
  <summary>Remote Presentation flow</summary>

```ts
// Scan e retrive qr-code
const qrcode = ...

// Retrieve the integrity key tag from the store and create its context
const integrityKeyTag = "example"; // Let's assume this is the key tag used to create the wallet instance
const integrityContext = getIntegrityContext(integrityKeyTag);

// Let's assume the key esists befor starting the presentation process
const wiaCryptoContext = createCryptoContextFor(WIA_KEYTAG);

const { WALLET_PROVIDER_BASE_URL, WALLET_EAA_PROVIDER_BASE_URL, REDIRECT_URI } =
  env; // Let's assume these are the environment variables

/**
 * Obtains a new Wallet Instance Attestation.
 * WARNING: The integrity context must be the same used when creating the Wallet Instance with the same keytag.
 */
const walletInstanceAttestation =
  await WalletInstanceAttestation.getAttestation({
    wiaCryptoContext,
    integrityContext,
    walletProviderBaseUrl: WALLET_PROVIDER_BASE_URL,
    appFetch,
  });

// Start the issuance flow
const { requestURI, clientId } = Credential.Presentation.startFlowFromQR(qrcode);

// If use trust federation: Evaluate issuer trust and Fetch Jwks from rpConf
const { rpConf } = await Credential.Presentation.evaluateRelyingPartyTrust(clientId);
const jwks = await Credential.Presentation.fetchJwksFromConfig(rpConf);

// If not use trust: Fetch Jwks from well-know
const jwks = await Credential.Presentation.fetchJwksFromUri(
  requestURI,
  appFetch,
);

const requestObject = await Credential.Presentation.getRequestObject(
  requestURI,
  {
    wiaCryptoContext: wiaCryptoContext,
    appFetch: appFetch,
    walletInstanceAttestation: walletInstanceAttestation,
  }
);

const presentationDefinition = await Credential.Presentation.retrieveOrFetchPresentDefinition(
  requestObject,
  {
    appFetch: appFetch,
  },
  rpConf // If trust federation is used
);

// For each credential, find it and evaluate input descriptor and disclosures
  const disclosuresMatched = Credential.Presentation.evaluateInputDescriptionForSdJwt4VC(
    inputDescriptor,
    credential.payload,
    disclosures // If trust federation is used
  );


```

</details>