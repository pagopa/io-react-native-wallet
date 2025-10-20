import type { Out } from "../../utils/misc";
import {
  IoWalletError,
  IssuerResponseError,
  IssuerResponseErrorCodes,
} from "../../utils/errors";
import { decode as decodeJwt, verify } from "@pagopa/io-react-native-jwt";
import type { EvaluateIssuerTrust, StatusAssertion } from ".";
import {
  type InvalidStatusErrorReason,
  ParsedStatusAssertion,
  ParsedStatusAssertionError,
  ParsedStatusAssertionResponse,
  StatusType,
} from "./types";
import { Logger, LogLevel } from "../../utils/logging";
import type { ObtainCredential } from "../issuance";
import { extractJwkFromCredential } from "../../utils/credentials";
import { isSameThumbprint } from "../../utils/jwk";
import type { SupportedSdJwtLegacyFormat } from "../../sd-jwt/types";

export type VerifyAndParseStatusAssertion = (
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  statusAssertion: Out<StatusAssertion>,
  credential: Out<ObtainCredential>["credential"],
  format: Out<ObtainCredential>["format"] | SupportedSdJwtLegacyFormat
) => Promise<{ parsedStatusAssertion: ParsedStatusAssertion }>;

/**
 * Given a status assertion, verifies that:
 * - It's in the supported format;
 * - The assertion is correctly signed;
 * - It's bound to the given key.
 * @param issuerConf The Issuer configuration returned by {@link evaluateIssuerTrust}
 * @param statusAssertion The encoded status assertion returned by {@link statusAssertion}
 * @param context.credentialCryptoContext The crypto context used to obtain the credential in {@link obtainCredential}
 * @returns A parsed status assertion
 * @throws {IoWalletError} If the credential signature is not verified with the Issuer key set
 * @throws {IssuerResponseError} If the status assertion contains an error or the credential status is invalid
 */
export const verifyAndParseStatusAssertion: VerifyAndParseStatusAssertion =
  async (issuerConf, rawStatusAssertion, credential, format) => {
    const { statusAssertion } = rawStatusAssertion;

    await verify(
      statusAssertion,
      issuerConf.openid_credential_issuer.jwks.keys
    );

    const decodedJwt = decodeJwt(statusAssertion);
    const parsedStatusAssertion = ParsedStatusAssertionResponse.parse({
      header: decodedJwt.protectedHeader,
      payload: decodedJwt.payload,
    });

    Logger.log(
      LogLevel.DEBUG,
      `Parsed status assertion: ${JSON.stringify(parsedStatusAssertion)}`
    );

    // Errors are transmitted in the JWT and use a 200 HTTP status code
    if (isStatusAssertionError(parsedStatusAssertion)) {
      throw new IssuerResponseError({
        code: IssuerResponseErrorCodes.CredentialInvalidStatus,
        message: "The status assertion contains an error",
        statusCode: 200,
        reason: buildErrorReason(parsedStatusAssertion),
      });
    }

    const { cnf, credential_status_type } = parsedStatusAssertion.payload;
    const holderBindingKey = await extractJwkFromCredential(credential, format);

    if (!(await isSameThumbprint(cnf.jwk, holderBindingKey))) {
      const errorMessage = `Failed to verify holder binding for status assertion: the thumbprints of keys ${cnf.jwk.kid} and ${holderBindingKey.kid} do not match`;
      Logger.log(LogLevel.ERROR, errorMessage);
      throw new IoWalletError(errorMessage);
    }

    if (credential_status_type !== StatusType.VALID) {
      throw new IssuerResponseError({
        code: IssuerResponseErrorCodes.CredentialInvalidStatus,
        message: "Invalid status found for the given credential",
        statusCode: 200,
        reason: buildErrorReason(parsedStatusAssertion),
      });
    }

    return { parsedStatusAssertion };
  };

const isStatusAssertionError = (
  assertion: ParsedStatusAssertionResponse
): assertion is ParsedStatusAssertionError =>
  assertion.header.typ === "status-assertion-error+jwt";

/**
 * Build an object containing the details on the error to use as the IssuerResponseError's reason
 * @param assertion The status assertion response, both success or failure
 * @returns The error's reason object
 */
const buildErrorReason = ({
  payload,
}: ParsedStatusAssertionResponse): InvalidStatusErrorReason =>
  "error" in payload
    ? payload
    : {
        error: payload.credential_status_detail!.state,
        error_description: payload.credential_status_detail!.description,
      };
