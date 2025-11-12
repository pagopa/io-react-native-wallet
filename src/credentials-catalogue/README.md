# Digital Credentials Catalogue

Module that manages the [**Digital Credentials Catalogue**](https://italia.github.io/eid-wallet-it-docs/releases/1.1.0/en/registry-catalogue.html) published by the Trust Anchor.

The module allows:
- Fetching, verifying and parsing the catalogue's JWT.

## Usage

```ts
// Fetch the catalogue
const TRUST_ANCHOR_BASE_URL = "https://pre.ta.wallet.ipzs.it";
const credentialsCatalogue =
  await CredentialsCatalogue.fetchAndParseCatalogue(TRUST_ANCHOR_BASE_URL);
```
