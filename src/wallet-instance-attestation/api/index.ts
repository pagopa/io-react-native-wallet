import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import type { IntegrityContext } from "../../utils/integrity";
import type {
  DecodedWalletInstanceAttestation,
  WalletAttestation,
  WalletAttestationRequestParams,
} from "./types";

export interface WalletInstanceAttestationApi {
  /**
   * Request a Wallet Instance Attestation (WIA) to the Wallet provider.
   * The Wallet Instance Attestation may be issued in different formats.
   *
   * @param requestParams Wallet Provider data for the Wallet Attestation request
   * @param ctx.wiaCryptoContext The key pair associated with the WIA. Will be use to prove the ownership of the attestation.
   * @param ctx.integrityContext The hardware key pair associated with the Wallet Instance
   * @param ctx.appFetch (optional) Http client
   * @returns The retrieved Wallet Instance Attestation tokens
   * @throws {WalletProviderResponseError} with a specific code for more context
   */
  getAttestation(
    requestParams: WalletAttestationRequestParams,
    ctx: {
      wiaCryptoContext: CryptoContext;
      integrityContext: IntegrityContext;
      appFetch?: GlobalFetch["fetch"];
    }
  ): Promise<WalletAttestation[]>;

  /**
   * Decode a given JWT to get the parsed Wallet Instance Attestation object they define.
   * It ensures provided data is in a valid shape.
   *
   * It DOES NOT verify token signature nor check disclosures are correctly referenced by the JWT.
   * Use {@link verify} instead
   *
   * @param token The encoded token that represents a valid jwt for Wallet Instance Attestation
   * @returns The validated Wallet Instance Attestation object
   * @throws A decoding error if the token doesn't resolve in a valid JWT
   * @throws A validation error if the provided data doesn't result in a valid Wallet Instance Attestation
   */
  decode(token: string): DecodedWalletInstanceAttestation;

  /**
   * Verify a given JWT to get the parsed Wallet Instance Attestation object they define.
   * Same as {@link decode} plus token signature verification
   *
   * @param token The encoded token that represents a valid jwt
   * @returns {DecodedAttestationJwt} The validated Wallet Instance Attestation object
   * @throws A decoding error if the token doesn't resolve in a valid JWT
   * @throws A validation error if the provided data doesn't result in a valid Wallet Instance Attestation
   * @throws Invalid signature error if the token signature is not valid
   */
  verify(token: string): Promise<DecodedWalletInstanceAttestation>;
}
