import {
  getTrustAnchors,
  LoTEProfile,
  type ParsedLoTE,
} from "@pagopa/io-wallet-eudi-trust";

const WRPAC_ISSUANCE_SERVICE_TYPE =
  "http://uri.etsi.org/19602/SvcType/WRPAC/Issuance";

/**
 * Gets the Trust Anchors to authenticate the Verifier in a proximity presentation (ISO 18013-5 reader authentication).
 * The Verifier signs its requests with its access certificate (WRPAC), so the Trust Anchors are the ones
 * published by the WRPAC Providers LoTE.
 *
 * **Note:** this function DOES NOT perform the LoTE validation.
 *
 * @param wrpacLote The WRPAC Providers List of Trusted Entities
 * @returns The Trust Anchors, each one as a single certificate chain, in the format of the `certificates`
 * parameter of `ISO18013_5.startEngagement`
 */
export const getReaderTrustAnchors = (wrpacLote: ParsedLoTE): string[][] =>
  getTrustAnchors({
    lote: wrpacLote.document,
    profile: LoTEProfile.EUWRPACProvidersList,
    serviceTypeIdentifier: WRPAC_ISSUANCE_SERVICE_TYPE,
  }).map((certificate) => [certificate]);
