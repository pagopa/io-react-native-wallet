import type { IssuerConfig } from "../api";

import { IoWalletError } from "../../../utils/errors";
import { Logger, LogLevel } from "../../../utils/logging";
import { AuthorizationDetail } from "../../../utils/par";

/**
 * Ensures that the credential type requested is supported by the issuer and contained in the
 * issuer configuration.
 * @param issuerConf The issuer configuration returned by {@link evaluateIssuerTrust}
 * @param credentialId The credential configuration ID to be requested;
 * @returns The credential definition to be used in the request which includes the format and the type and its type
 */
export const selectCredentialDefinition = (
  issuerConf: IssuerConfig,
  credentialId: string,
): AuthorizationDetail => {
  const credential_configurations_supported =
    issuerConf.credential_configurations_supported;

  const [result] = Object.keys(credential_configurations_supported)
    .filter((e) => e.includes(credentialId))
    .map(() => ({
      credential_configuration_id: credentialId,
      type: "openid_credential" as const,
    }));

  if (!result) {
    Logger.log(
      LogLevel.ERROR,
      `Requested credential ${credentialId} is not supported by the issuer according to its configuration ${JSON.stringify(credential_configurations_supported)}`,
    );
    throw new IoWalletError(`No credential support the type '${credentialId}'`);
  }
  return result;
};
