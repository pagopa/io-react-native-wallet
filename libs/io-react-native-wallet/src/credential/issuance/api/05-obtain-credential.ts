import type { Signer } from "../../../utils/crypto";
import type { Out } from "../../../utils/misc";
import type { AuthorizeAccessApi } from "./04-authorize-access";
import type { IssuerConfig } from "./IssuerConfig";
import type { CredentialFormat } from "./types";

export interface ObtainCredentialApi {
  /**
   * Obtains the credential from the issuer.
   * The key pair of the credentialSigner is used for Openid4vci proof JWT to be presented with the Access Token and the DPoP Proof JWT at the Credential Endpoint
   * of the Credential Issuer to request the issuance of a credential linked to the public key contained in the JWT proof.
   * The Openid4vci proof JWT incapsulates the nonce extracted from the token response from the {@link authorizeAccess} step.
   * The credential request is sent to the Credential Endpoint of the Credential Issuer via HTTP POST with the type of the credential, its format, the access token and the JWT proof.
   * @since 1.0.0
   *
   * @param issuerConf The issuer configuration returned by {@link evaluateIssuerTrust}
   * @param accessToken The access token response returned by {@link authorizeAccess}
   * @param clientId The client id returned by {@link startUserAuthorization}
   * @param credentialDefinition The credential definition of the credential to be obtained returned by {@link authorizeAccess}
   * @param context.credentialSigner The signer used to obtain the credential
   * @param context.dPopSigner The DPoP signer. It must always be bound to a local key (not remote)
   * @param context.keyAttestation (optional) The Key Attestation JWT bound to the provided credentialSigner
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
      appFetch?: typeof fetch;
      credentialSigner: Signer;
      dPopSigner: Signer;
      keyAttestation?: string;
    },
  ): Promise<{
    credential: string;
    format: CredentialFormat;
  }>;

  /**
   * Obtains a batch of credentials from the issuer.
   * The batch includes the same credential format and dataset with different cryptographic data.
   * For this reason, the function accepts a list of {@link Signer}; the rest of the parameters are the same as {@link obtainCredential}.
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
      appFetch?: typeof fetch;
      credentialSigners: Signer[];
      dPopSigner: Signer;
      keyAttestation?: string;
    },
  ): Promise<{ credential: string; format: CredentialFormat }[]>;
}
