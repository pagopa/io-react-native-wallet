import { Logger, LogLevel } from "../../../utils/logging";
import { InvalidCredentialOfferError } from "../common/errors";
import type { OfferApi } from "../api";

export const selectGrantType: OfferApi["selectGrantType"] = (offer) => {
  const grants = offer.grants;

  if (!grants) {
    Logger.log(LogLevel.ERROR, "Credential offer does not include any grants");
    throw new InvalidCredentialOfferError(
      "Credential offer does not include any grants"
    );
  }

  const preAuthGrantKey =
    "urn:ietf:params:oauth:grant-type:pre-authorized_code";
  const preAuthGrant = grants[preAuthGrantKey];

  if (preAuthGrant) {
    if (!preAuthGrant["pre-authorized_code"]) {
      Logger.log(
        LogLevel.ERROR,
        `Grant '${preAuthGrantKey}' is missing 'pre-authorized_code' field`
      );
      throw new InvalidCredentialOfferError(
        "Invalid pre-authorized grant object"
      );
    }

    Logger.log(LogLevel.INFO, "Selected grant type: pre-authorized_code");
    return {
      "pre-authorized_code": preAuthGrant["pre-authorized_code"],
      tx_code: preAuthGrant.tx_code,
      type: "pre-authorized_code",
    };
  }

  const authCodeGrant = grants.authorization_code;

  if (authCodeGrant) {
    Logger.log(LogLevel.INFO, "Selected grant type: authorization_code");

    const authorizationServer =
      authCodeGrant.authorization_server ?? offer.credential_issuer;

    return {
      issuer_state: authCodeGrant.issuer_state,
      authorization_server: authorizationServer,
      scope: authCodeGrant.scope,
      type: "authorization_code",
    };
  }

  Logger.log(
    LogLevel.ERROR,
    "Credential offer grants did not contain a supported type (pre-authorized_code or authorization_code)"
  );
  throw new InvalidCredentialOfferError(
    "Unsupported or missing grant type in credential offer"
  );
};
