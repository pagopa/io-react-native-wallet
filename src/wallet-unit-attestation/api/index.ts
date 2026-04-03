import type { IntegrityContext } from "../../utils/integrity";
import type { KeyAttestationCryptoContext } from "../../utils/crypto";
import type {
  DecodedWalletUnitAttestation,
  WalletAttestation,
  WalletAttestationRequestParams,
} from "./types";

interface UnsupportedApi {
  isSupported: false;
}

export type WalletUnitAttestationApi =
  | WalletUnitAttestationSupportedApi
  | UnsupportedApi;

export interface WalletUnitAttestationSupportedApi {
  isSupported: true;

  /**
   * Request a Wallet Unit Attestation (WUA) to the Wallet provider with one or more keys to attest.
   * Each key must be provided as a {@link KeyAttestationCryptoContext}.
   *
   * @param requestParams Wallet Provider data for the Wallet Attestation request
   * @param ctx.keysToAttest The list of KeyAttestationCryptoContext's of the keys to attest
   * @param ctx.integrityContext The hardware key pair associated with the Wallet Instance
   * @param ctx.appFetch (optional) Http client
   * @returns The generated Wallet Unit Attestation with the attested keys
   */
  getAttestation(
    requestParams: WalletAttestationRequestParams,
    ctx: {
      keysToAttest: KeyAttestationCryptoContext[];
      integrityContext: IntegrityContext;
      appFetch?: GlobalFetch["fetch"];
    }
  ): Promise<WalletAttestation>;

  /**
   * Decode a given JWT to get the parsed Wallet Unit Attestation object they define.
   * It ensures provided data is in a valid shape.
   *
   * It DOES NOT verify token signature.
   *
   * @param token The encoded token that represents a valid jwt for Wallet Unit Attestation
   * @returns The validated Wallet Unit Attestation object
   * @throws A decoding error if the token doesn't resolve in a valid JWT
   * @throws A validation error if the provided data doesn't result in a valid Wallet Unit Attestation
   */
  decode(token: string): DecodedWalletUnitAttestation;
}
