import type { KeyAttestationCryptoContext } from "../../utils/crypto";
import type { IntegrityContext } from "../../utils/integrity";
import type {
  DecodedKeyAttestation,
  WalletAttestation,
  WalletAttestationRequestParams,
} from "./types";

export type KeyAttestationApi =
  | UnsupportedApi
  | KeyAttestationSupportedApi;

export interface KeyAttestationSupportedApi {
  /**
   * Decode a given JWT to get the parsed Key Attestation object they define.
   * It ensures provided data is in a valid shape.
   *
   * It DOES NOT verify token signature.
   *
   * @param token The encoded token that represents a valid jwt for Key Attestation
   * @returns The validated Key Attestation object
   * @throws A decoding error if the token doesn't resolve in a valid JWT
   * @throws A validation error if the provided data doesn't result in a valid Key Attestation
   */
  decode(token: string): DecodedKeyAttestation;

  /**
   * Request a Key Attestation (KA) to the Wallet provider with one or more keys to attest.
   * Each key must be provided as a {@link KeyAttestationCryptoContext}.
   *
   * @param requestParams Wallet Provider data for the Wallet Attestation request
   * @param ctx.keysToAttest The list of KeyAttestationCryptoContext's of the keys to attest
   * @param ctx.integrityContext The hardware key pair associated with the Wallet Instance
   * @param ctx.appFetch (optional) Http client
   * @returns The generated Key Attestation with the attested keys
   */
  getAttestation(
    requestParams: WalletAttestationRequestParams,
    ctx: {
      appFetch?: GlobalFetch["fetch"];
      integrityContext: IntegrityContext;
      keysToAttest: KeyAttestationCryptoContext[];
    },
  ): Promise<WalletAttestation>;

  isSupported: true;
}

interface UnsupportedApi {
  isSupported: false;
}
