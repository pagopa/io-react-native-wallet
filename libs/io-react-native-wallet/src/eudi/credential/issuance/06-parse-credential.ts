import { hasher } from "@owf/crypto";
import { CBOR } from "@pagopa/io-react-native-iso18013";
import { decodeSdJwtSync, getClaimsSync } from "@sd-jwt/core";

import type { ParsedCredential } from "./types";

import { IoWalletError } from "../../../utils/errors";

/**
 * Parses an issued credential to read its claims.
 *
 * The issuer signature and its trust are NOT verified yet.
 * TODO: verify the issuer certificate chain against the EU List of Trusted Lists (LoTL).
 *
 * @param credential - The issued credential
 * @param format - The credential format, `dc+sd-jwt` or `mso_mdoc`
 * @returns The credential claims
 * @throws {IoWalletError} If the format is not supported or the credential is malformed
 */
export const parseCredential = async (
  credential: string,
  format: string,
): Promise<ParsedCredential> => {
  switch (format) {
    case "dc+sd-jwt":
    case "vc+sd-jwt": {
      const { disclosures, jwt } = decodeSdJwtSync(credential, hasher);
      const claims = getClaimsSync<Record<string, unknown>>(
        jwt.payload,
        disclosures,
        hasher,
      );
      return { claims, format };
    }
    case "mso_mdoc": {
      const issuerSigned = await CBOR.decodeIssuerSigned(credential);
      if (!issuerSigned) {
        throw new IoWalletError("Invalid mdoc credential");
      }
      const claims = Object.fromEntries(
        Object.entries(issuerSigned.nameSpaces).map(([namespace, items]) => [
          namespace,
          Object.fromEntries(
            items.map((item) => [item.elementIdentifier, item.elementValue]),
          ),
        ]),
      );
      return { claims, format };
    }
    default:
      throw new IoWalletError(`Unsupported credential format: ${format}`);
  }
};
