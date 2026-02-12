import { createMapper } from "../../../utils/mappers";
import type { CredentialIssuerMetadata } from "./types";
import type { IssuerMetadata } from "../api";

/**
 * Mapper to convert CredentialIssuerMetadata to IssuerMetadata.
 * This is used to map the issuer metadata obtained from the Credential Offer to the format expected by the rest of the application.
 * It handles the transformation of credential configurations and ensures that all required fields are properly mapped.
 * @returns An IssuerMetadata object with the mapped fields.
 */
export const mapToIssuerMetadata = createMapper<
  CredentialIssuerMetadata,
  IssuerMetadata
>((x) => {
  const configs = Object.entries(x.credential_configurations_supported).reduce(
    (acc, [key, config]) => {
      acc[key] = {
        format: config.format,
        scope: config.scope ?? "", // Default to empty string if scope is not provided
        vct: config.vct ?? "", // Default to empty string if vct is not provided

        display: config.credential_metadata?.display?.map((d) => ({
          name: d.name,
          locale: d.locale,
        })),
      };
      return acc;
    },
    {} as IssuerMetadata["credential_configurations_supported"]
  );

  return {
    credential_issuer: x.credential_issuer,
    credential_endpoint: x.credential_endpoint,
    nonce_endpoint: x.nonce_endpoint,
    credential_configurations_supported: configs,
    notification_endpoint: x.notification_endpoint,
    authorization_servers: x.authorization_servers,
  };
});
