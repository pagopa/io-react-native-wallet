import type { Out } from "../../utils/misc";
import { IoWalletError } from "../../utils/errors";
import {
  type CryptoContext,
  decode as decodeJwt,
  verify,
} from "@pagopa/io-react-native-jwt";
import type { EvaluateIssuerTrust, StatusAttestation } from "../status";
import { ParsedStatusAttestation } from "./types";
import { Logger, LogLevel } from "../../utils/logging";
import { extractJwkFromCredential } from "../../utils/credentials";
import type { ObtainCredential } from "../issuance";

export type VerifyAndParseStatusAttestation = (
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  statusAttestation: Out<StatusAttestation>,
  context: {
    credentialCryptoContext: CryptoContext;
  },
  credential: Out<ObtainCredential>["credential"],
  format: Out<ObtainCredential>["format"]
) => Promise<{ parsedStatusAttestation: ParsedStatusAttestation }>;

/**
 * Given a status attestation, verifies that:
 * - It's in the supported format;
 * - The attestation is correctly signed;
 * - It's bound to the given key.
 * @param issuerConf The Issuer configuration returned by {@link evaluateIssuerTrust}
 * @param rawStatusAttestation The encoded status attestation returned by {@link statusAttestation}
 * @param context.credentialCryptoContext The crypto context used to obtain the credential in {@link obtainCredential}
 * @param credential The credential to be verified
 * @param format The format of the credential, e.g. "sd-jwt"
 * @returns A parsed status attestation
 * @throws {IoWalletError} If the credential signature is not verified with the Issuer key set
 * @throws {IoWalletError} If the credential is not bound to the provided user key
 * @throws {IoWalletError} If the credential data fail to parse
 */
export const verifyAndParseStatusAttestation: VerifyAndParseStatusAttestation =
  async (issuerConf, rawStatusAttestation, _, credential, format) => {
    try {
      const { statusAttestation } = rawStatusAttestation;

      await verify(
        statusAttestation,
        issuerConf.openid_credential_issuer.jwks.keys
      );

      const decodedJwt = decodeJwt(statusAttestation);
      const parsedStatusAttestation = ParsedStatusAttestation.parse({
        header: decodedJwt.protectedHeader,
        payload: decodedJwt.payload,
      });

      Logger.log(
        LogLevel.DEBUG,
        `Parsed status attestation: ${JSON.stringify(parsedStatusAttestation)}`
      );

      const holderBindingKey = await extractJwkFromCredential(
        credential,
        format
      );
      const { cnf } = parsedStatusAttestation.payload;
      if (!cnf.jwk.kid || cnf.jwk.kid !== holderBindingKey.kid) {
        Logger.log(
          LogLevel.ERROR,
          `Failed to verify holder binding for status attestation, expected kid: ${holderBindingKey.kid}, got: ${parsedStatusAttestation.payload.cnf.jwk.kid}`
        );
        throw new IoWalletError(
          `Failed to verify holder binding for status attestation, expected kid: ${holderBindingKey.kid}, got: ${parsedStatusAttestation.payload.cnf.jwk.kid}`
        );
      }

      return { parsedStatusAttestation };
    } catch (e) {
      throw new IoWalletError(
        `Failed to verify status attestation: ${JSON.stringify(e)}`
      );
    }
  };
