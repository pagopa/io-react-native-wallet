import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import type { IntegrityContext } from "../../utils/integrity";
import type { DecodedAttestationJwt, WalletAttestation } from "./types";

export interface WalletInstanceAttestationApi {
  /**
   * Request a Wallet Instance Attestation (WIA) to the Wallet provider.
   * The Wallet Attestation may be issued in different formats and components (Wallet App and Wallet Unit).
   *
   * @param params.wiaCryptoContext The key pair associated with the WIA. Will be use to prove the ownership of the attestation.
   * @param params.appFetch (optional) Http client
   * @param walletProviderBaseUrl Base url for the Wallet Provider
   * @returns The retrieved Wallet Instance Attestation tokens
   * @throws {WalletProviderResponseError} with a specific code for more context
   */
  getAttestation(ctx: {
    wiaCryptoContext: CryptoContext;
    integrityContext: IntegrityContext;
    walletProviderBaseUrl: string;
    appFetch?: GlobalFetch["fetch"];
  }): Promise<WalletAttestation[]>;

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
  decode(token: string): DecodedAttestationJwt;

  /**
   * Verify a given JWT to get the parsed Wallet Instance Attestation object they define.
   * Same as {@link decode} plus token signature verification
   *
   * @param token The encoded token that represents a valid jwt
   * @returns {WalletInstanceAttestationJwt} The validated Wallet Instance Attestation object
   * @throws A decoding error if the token doesn't resolve in a valid JWT
   * @throws A validation error if the provided data doesn't result in a valid Wallet Instance Attestation
   * @throws Invalid signature error if the token signature is not valid
   */
  verify(token: string): Promise<DecodedAttestationJwt>;
}
