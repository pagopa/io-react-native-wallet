import { ValidationError as SdkValidationError } from "@openid4vc/utils";
import {
  FetchAuthorizationResponseError as SdkFetchAuthorizationResponseError,
  CreateAuthorizationResponseError as SdkCreateAuthorizationResponseError,
} from "@pagopa/io-wallet-oid4vp";
import {
  RelyingPartyResponseError,
  RelyingPartyResponseErrorCodes,
  ResponseErrorBuilder,
} from "../../../utils/errors";
import { Oauth2JwtParseError as SdkOauth2JwtParseError } from "@pagopa/io-wallet-oauth2";
import { InvalidRequestObjectError } from "../common/errors";
import { UnexpectedStatusCodeError as SdkUnexpectedStatusCodeError } from "@pagopa/io-wallet-utils";
import type { RelyingPartyResponseErrorCode } from "src/utils/error-codes";

/**
 * Helper to create a generic RelyingPartyResponseError
 */
const toRelyingPartyResponseError = (
  message: string,
  statusCode: number,
  code: RelyingPartyResponseErrorCode = RelyingPartyResponseErrorCodes.RelyingPartyGenericError
) =>
  new RelyingPartyResponseError({
    code,
    message,
    reason: message,
    statusCode,
  });

/**
 * Mapping Sdk errors during Request Object retrieval (Fetch/QR)
 */
export const mapSdkFetchAuthRequestError = (err: unknown) => {
  if (err instanceof SdkUnexpectedStatusCodeError) {
    throw toRelyingPartyResponseError(err.message, err.statusCode);
  }

  throw err;
};

/**
 * Mapping Sdk errors during JWT parsing and verification
 */
export const mapSdkRequestObjectError = (err: unknown) => {
  if (err instanceof SdkValidationError) {
    throw new InvalidRequestObjectError(
      "The Request Object structure is invalid",
      err.message
    );
  }

  if (err instanceof SdkOauth2JwtParseError) {
    throw new InvalidRequestObjectError(
      "The Request Object is not a valid JWT"
    );
  }

  const message = err instanceof Error ? err.message : String(err);
  throw new InvalidRequestObjectError(message);
};

/**
 * Mapping Sdk errors during Authorization Response submission (JARM / Post)
 */
export const mapSdkAuthorizationResponseError = (err: unknown) => {
  if (err instanceof SdkUnexpectedStatusCodeError) {
    throw new ResponseErrorBuilder(RelyingPartyResponseError)
      .handle(400, {
        code: RelyingPartyResponseErrorCodes.InvalidAuthorizationResponse,
        message:
          "The Authorization Response contains invalid parameters or it is malformed",
      })
      .handle(403, {
        code: RelyingPartyResponseErrorCodes.InvalidAuthorizationResponse,
        message: "The Authorization Response was forbidden",
      })
      .handle("*", {
        code: RelyingPartyResponseErrorCodes.RelyingPartyGenericError,
        message: "Unable to successfully send the Authorization Response",
      })
      .buildFrom(err);
  }

  if (
    err instanceof SdkCreateAuthorizationResponseError ||
    err instanceof SdkFetchAuthorizationResponseError
  ) {
    throw toRelyingPartyResponseError(err.message, err.statusCode ?? 400);
  }

  throw err;
};
