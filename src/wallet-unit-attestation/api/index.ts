import type { IntegrityContext } from "../../utils/integrity";
import type { AttestationCryptoContext } from "../../utils/crypto";
import type {
  DecodedWalletUnitAttestation,
  WalletAttestation,
  WalletAttestationRequestParams,
} from "./types";

export interface WalletUnitAttestationApi {
  getAttestation(
    requestParams: WalletAttestationRequestParams,
    ctx: {
      attestationCryptoContexts: AttestationCryptoContext[];
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
