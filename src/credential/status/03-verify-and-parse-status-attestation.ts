import type { Out } from "../../utils/misc";
import {
  IoWalletError,
  IssuerResponseError,
  IssuerResponseErrorCodes,
} from "../../utils/errors";
import { verify, type CryptoContext } from "@pagopa/io-react-native-jwt";
import type { EvaluateIssuerTrust, StatusAttestation } from "../status";
import {
  ParsedStatusAssertion,
  ParsedStatusAssertionError,
  ParsedStatusAssertionResponse,
  StatusType,
  type InvalidStatusErrorReason,
} from "./types";
import { decode as decodeJwt } from "@pagopa/io-react-native-jwt";
import { LogLevel, Logger } from "../../utils/logging";

export type VerifyAndParseStatusAttestation = (
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  statusAttestation: Out<StatusAttestation>,
  context: {
    credentialCryptoContext: CryptoContext;
  }
) => Promise<{ parsedStatusAttestation: ParsedStatusAssertion }>;

/**
 * Given a status attestation, verifies that:
 * - It's in the supported format;
 * - The attestation is correctly signed;
 * - It's bound to the given key.
 * @param issuerConf The Issuer configuration returned by {@link evaluateIssuerTrust}
 * @param statusAttestation The encoded status attestation returned by {@link statusAttestation}
 * @param context.credentialCryptoContext The crypto context used to obtain the credential in {@link obtainCredential}
 * @returns A parsed status attestation
 * @throws {IoWalletError} If the credential signature is not verified with the Issuer key set
 * @throws {IssuerResponseError} If the status attestation contains an error or the credential status is invalid
 */
export const verifyAndParseStatusAttestation: VerifyAndParseStatusAttestation =
  async (issuerConf, rawStatusAttestation, context) => {
    const { statusAttestation } = rawStatusAttestation;
    const { credentialCryptoContext } = context;

    await verify(
      statusAttestation,
      issuerConf.openid_credential_issuer.jwks.keys
    );

    const decodedJwt = decodeJwt(statusAttestation);
    const parsedStatusAttestation = ParsedStatusAssertionResponse.parse({
      header: decodedJwt.protectedHeader,
      payload: decodedJwt.payload,
    });

    Logger.log(
      LogLevel.DEBUG,
      `Parsed status attestation: ${JSON.stringify(parsedStatusAttestation)}`
    );

    // Errors are transmitted in the JWT and use a 200 HTTP status code
    if (isStatusAssertionError(parsedStatusAttestation)) {
      throw new IssuerResponseError({
        code: IssuerResponseErrorCodes.StatusAttestationRequestFailed,
        message: "The credential status request has failed",
        statusCode: 200,
        reason: buildErrorReason(parsedStatusAttestation),
      });
    }

    const { cnf, credential_status_type } = parsedStatusAttestation.payload;
    const holderBindingKey = await credentialCryptoContext.getPublicKey();

    if (!cnf.jwk.kid || cnf.jwk.kid !== holderBindingKey.kid) {
      const errorMessage = `Failed to verify holder binding for status attestation, expected kid: ${holderBindingKey.kid}, got: ${cnf.jwk.kid}`;
      Logger.log(LogLevel.ERROR, errorMessage);
      throw new IoWalletError(errorMessage);
    }

    if (credential_status_type !== StatusType.VALID) {
      throw new IssuerResponseError({
        code: IssuerResponseErrorCodes.CredentialInvalidStatus,
        message: "Invalid status found for the given credential",
        statusCode: 200,
        reason: buildErrorReason(parsedStatusAttestation),
      });
    }

    return { parsedStatusAttestation };
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
