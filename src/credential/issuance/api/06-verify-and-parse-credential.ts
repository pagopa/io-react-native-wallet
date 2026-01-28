import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import type { IssuerConfig } from "./IssuerConfig";

// The credential as a collection of attributes in plain value
type ParsedCredential = {
  /** Attribute key */
  [claim: string]: {
    name:
      | /* if i18n is provided */ Record<
          string /* locale */,
          string /* value */
        >
      | /* if no i18n is provided */ string
      | undefined; // Add undefined as a possible value for the name property
    value: unknown;
  };
};

export interface VerifyAndParseCredentialApi {
  /**
   * Verify and parse an encoded credential.
   * @param issuerConf The Issuer configuration returned by {@link evaluateIssuerTrust}
   * @param credential The encoded credential returned by {@link obtainCredential}
   * @param credentialConfigurationId The credential configuration ID that defines the provided credential
   * @param context.credentialCryptoContext The crypto context used to obtain the credential in {@link obtainCredential}
   * @param context.ignoreMissingAttributes Skip error when attributes declared in the issuer configuration are not found within disclosures
   * @param context.includeUndefinedAttributes Include attributes not explicitly declared in the issuer configuration
   * @returns A parsed credential with attributes in plain value, the expiration and issuance date of the credential
   * @throws {IoWalletError} If the credential signature is not verified with the Issuer key set
   * @throws {IoWalletError} If the credential is not bound to the provided user key
   * @throws {IoWalletError} If the credential data fail to parse
   */
  verifyAndParseCredential(
    issuerConf: IssuerConfig,
    credential: string,
    credentialConfigurationId: string,
    context: {
      credentialCryptoContext: CryptoContext;
      /**
       * Do not throw an error when an attribute is not found within disclosures.
       */
      ignoreMissingAttributes?: boolean;
      /**
       * Include attributes that are not explicitly mapped in the issuer configuration.
       */
      includeUndefinedAttributes?: boolean;
    },
    x509CertRoot?: string
  ): Promise<{
    parsedCredential: ParsedCredential;
    expiration: Date;
    issuedAt: Date | undefined;
  }>;
}
