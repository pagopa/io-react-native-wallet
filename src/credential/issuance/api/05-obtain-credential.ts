import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import type { Out } from "../../../utils/misc";
import type { IssuerConfig } from "./IssuerConfig";
import type { AuthorizeAccessApi } from "./04-authorize-access";
import type { CredentialFormat } from "./types";

export interface ObtainCredentialApi {
  /**
   * Obtains the credential from the issuer.
   * The key pair of the credentialCryptoContext is used for Openid4vci proof JWT to be presented with the Access Token and the DPoP Proof JWT at the Credential Endpoint
   * of the Credential Issuer to request the issuance of a credential linked to the public key contained in the JWT proof.
   * The Openid4vci proof JWT incapsulates the nonce extracted from the token response from the {@link authorizeAccess} step.
   * The credential request is sent to the Credential Endpoint of the Credential Issuer via HTTP POST with the type of the credential, its format, the access token and the JWT proof.
   * @since 1.0.0
   *
   * @param issuerConf The issuer configuration returned by {@link evaluateIssuerTrust}
   * @param accessToken The access token response returned by {@link authorizeAccess}
   * @param clientId The client id returned by {@link startUserAuthorization}
   * @param credentialDefinition The credential definition of the credential to be obtained returned by {@link authorizeAccess}
   * @param context.credentialCryptoContext The crypto context used to obtain the credential
   * @param context.dPopCryptoContext The DPoP crypto context
   * @param context.walletUnitAttestation (optional) The Wallet Unit Attestation JWT bound to the provided credentialCryptoContext
   * @param context.appFetch (optional) fetch api implementation. Default: built-in fetch
   * @returns The credential response containing the credential
   */
  obtainCredential(
    issuerConf: IssuerConfig,
    accessToken: Out<AuthorizeAccessApi["authorizeAccess"]>["accessToken"],
    clientId: string,
    credentialDefinition: {
      credential_configuration_id: string;
      credential_identifier?: string;
    },
    context: {
      dPopCryptoContext: CryptoContext;
      credentialCryptoContext: CryptoContext;
      keyAttestationJwt: string;
      walletUnitAttestation?: string;
      appFetch?: GlobalFetch["fetch"];
    }
  ): Promise<{
    credential: string;
    format: CredentialFormat;
  }>;

  /**
   * Obtains a batch of credentials from the issuer.
   * The batch includes the same credential format and dataset with different cryptographic data.
   * For this reason, the function accetps a list of {@link CryptoContext}; the rest of the paramters are the same as {@link obtainCredential}.
   * @since 1.3.3
   *
   * @returns The list of credentials issued in the batch.
   */
  obtainCredentialsBatch(
    issuerConf: IssuerConfig,
    accessToken: Out<AuthorizeAccessApi["authorizeAccess"]>["accessToken"],
    clientId: string,
    credentialDefinition: {
      credential_configuration_id: string;
      credential_identifier: string;
    },
    context: {
      dPopCryptoContext: CryptoContext;
      credentialCryptoContexts: CryptoContext[];
      keyAttestationJwt: string;
      appFetch?: GlobalFetch["fetch"];
    }
  ): Promise<{ credential: string; format: CredentialFormat }[]>;
}
