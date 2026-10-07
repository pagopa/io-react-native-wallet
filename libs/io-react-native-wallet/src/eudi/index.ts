/**
 * EUDI Wallet flows, separate from the IT-Wallet ones, used to interoperate
 * with the wallets, issuers and verifiers of other member states.
 */
import * as CredentialIssuance from "./credential/issuance";
import * as CredentialOffer from "./credential/offer";

export { CredentialIssuance, CredentialOffer };
