import {
  IoWalletError,
  IssuerResponseError,
  IssuerResponseErrorCodes,
} from "../../../utils/errors";
import { decode as decodeJwt, verify } from "@pagopa/io-react-native-jwt";
import {
  type InvalidStatusErrorReason,
  ParsedStatusAssertionErrorJwt,
  ParsedStatusAssertionResponse,
  StatusType,
} from "./types";
import { Logger, LogLevel } from "../../../utils/logging";
import { extractJwkFromCredential } from "../../../utils/credentials";
import { isSameThumbprint } from "../../../utils/jwk";
import type { CredentialStatusApi } from "../api";
import { mapToParsedStatusAssertion } from "./mappers";

export const verifyAndParseStatusAssertion: CredentialStatusApi["verifyAndParseStatusAssertion"] =
  async (issuerConf, rawStatusAssertion, credential, format) => {
    const { statusAssertion } = rawStatusAssertion;

    await verify(statusAssertion, issuerConf.keys);

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

    return {
      parsedStatusAssertion: mapToParsedStatusAssertion(parsedStatusAssertion),
    };
  };

const isStatusAssertionError = (
  assertion: ParsedStatusAssertionResponse
): assertion is ParsedStatusAssertionErrorJwt =>
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
