import { IoWalletError } from "../../../utils/errors";
import { Logger, LogLevel } from "../../../utils/logging";
import { verifyAndParseCredentialMDoc } from "../common/06-verify-and-parse-credential.mdoc";
import { verifyAndParseCredentialSdJwt } from "../common/06-verify-and-parse-credential.sdjwt";
import type { IssuanceApi } from "../api";

export const verifyAndParseCredential: IssuanceApi["verifyAndParseCredential"] =
  async (
    issuerConf,
    credential,
    credentialConfigurationId,
    context,
    x509CertRoot
  ) => {
    const format =
      issuerConf.credential_configurations_supported[credentialConfigurationId]
        ?.format;

    switch (format) {
      case "dc+sd-jwt": {
        Logger.log(LogLevel.DEBUG, "Parsing credential in dc+sd-jwt format");
        return verifyAndParseCredentialSdJwt(
          issuerConf,
          credential,
          credentialConfigurationId,
          context
        );
      }
      case "mso_mdoc": {
        Logger.log(LogLevel.DEBUG, "Parsing credential in mso_mdoc format");
        return verifyAndParseCredentialMDoc(
          issuerConf,
          credential,
          credentialConfigurationId,
          context,
          x509CertRoot
        );
      }

      default: {
        const message = `Unsupported credential format: ${format}`;
        Logger.log(LogLevel.ERROR, message);
        throw new IoWalletError(message);
      }
    }
  };
