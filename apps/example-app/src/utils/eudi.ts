/**
 * Configuration of the EUDI Wallet flows, separate from the IT-Wallet one.
 */

/** URI schemes of the EUDI Credential Offers: the EU EAA one and the HAIP one */
export const EUDI_CREDENTIAL_OFFER_SCHEMES = ["eu-eaa-offer:", "haip-vci:"];

/** Client identifier used when the wallet authenticates as a public client */
export const EUDI_CLIENT_ID = "io-wallet-example";

/** Redirect URI of the Authorization Code Flow, on a scheme already registered by the app */
export const EUDI_REDIRECT_URI = "iowalletexample://eudi/authorization";

/** Key bound to the access tokens with DPoP */
export const EUDI_DPOP_KEYTAG = "EUDI_DPOP_KEYTAG";

/** Human readable label of a credential format */
export const getFormatLabel = (format: string) =>
  ({ "dc+sd-jwt": "SD-JWT VC", mso_mdoc: "mdoc", "vc+sd-jwt": "SD-JWT VC" })[
    format
  ] ?? format;
