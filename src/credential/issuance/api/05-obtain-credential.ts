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
      appFetch?: GlobalFetch["fetch"];
    }
  ): Promise<{
    credential: string;
    format: CredentialFormat;
  }>;
}
