import { hasher } from "@owf/crypto";
import { CBOR } from "@pagopa/io-react-native-iso18013";
import { decodeSdJwtSync, getClaimsSync } from "@sd-jwt/core";
import { b64tohex, b64utob64, X509, zulutodate } from "jsrsasign";

import type { CredentialCertificate, ParsedCredential } from "./types";

import { IoWalletError } from "../../../utils/errors";

/** JOSE names of the COSE signing algorithms (RFC 9053) */
const COSE_ALGORITHMS: Record<string, string> = {
  "-39": "PS512",
  "-38": "PS384",
  "-37": "PS256",
  "-36": "ES512",
  "-35": "ES384",
  "-8": "EdDSA",
  "-7": "ES256",
};

/** COSE header parameter of the signing algorithm */
const COSE_HEADER_ALG = 1;

/** Turns a distinguished name such as `/C=EU/CN=Issuer` into `CN=Issuer, C=EU` */
const formatDistinguishedName = (name: string) =>
  name.split("/").filter(Boolean).reverse().join(", ");

/**
 * Reads the subject, issuer and validity of a certificate.
 * @param certificate - The base64 or base64url DER certificate
 * @returns The certificate details, or `undefined` if the certificate is malformed
 */
const readCertificate = (
  certificate: string,
): CredentialCertificate | undefined => {
  try {
    const x509 = new X509();
    x509.readCertHex(b64tohex(b64utob64(certificate)));
    return {
      issuer: formatDistinguishedName(x509.getIssuerString()),
      notAfter: zulutodate(x509.getNotAfter()),
      notBefore: zulutodate(x509.getNotBefore()),
      subject: formatDistinguishedName(x509.getSubjectString()),
    };
  } catch {
    return undefined;
  }
};

/** Returns a date from a JWT NumericDate, in seconds */
const fromNumericDate = (value: unknown) =>
  typeof value === "number" ? new Date(value * 1000) : undefined;

/**
 * Parses an issued credential to read its claims.
 *
 * The issuer signature and its trust are NOT verified yet.
 * TODO: verify the issuer certificate chain against the EU List of Trusted Lists (LoTL).
 *
 * @param credential - The issued credential
 * @param format - The credential format, `dc+sd-jwt` or `mso_mdoc`
 * @returns The credential claims, with the unverified issuer signature details, validity and status
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
      const { header = {}, payload = {} } = jwt;
      const x5c = Array.isArray(header.x5c) ? header.x5c : [];
      const statusList = (
        payload.status as
          | undefined
          | { status_list?: { idx?: unknown; uri?: unknown } }
      )?.status_list;
      return {
        claims,
        format,
        signature: {
          algorithm: typeof header.alg === "string" ? header.alg : undefined,
          certificate:
            typeof x5c[0] === "string" ? readCertificate(x5c[0]) : undefined,
        },
        status:
          typeof statusList?.idx === "number" &&
          typeof statusList.uri === "string"
            ? { idx: statusList.idx, uri: statusList.uri }
            : undefined,
        validity: {
          issuedAt: fromNumericDate(payload.iat),
          validFrom: fromNumericDate(payload.nbf),
          validUntil: fromNumericDate(payload.exp),
        },
      };
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
      const { payload, protectedHeader, unprotectedHeader } =
        issuerSigned.issuerAuth;
      // The algorithm belongs to the protected header, the native decoder may also expose it
      const algorithm =
        unprotectedHeader.algorithm ??
        (protectedHeader &&
          (await CBOR.decode(protectedHeader)
            .then((header) => header?.[COSE_HEADER_ALG])
            .catch(() => undefined)));
      const certificate = unprotectedHeader.x5chain?.[0];
      // The MSO status is dropped by the native decoder, so the revocation status is not read
      return {
        claims,
        format,
        signature: {
          algorithm:
            algorithm === undefined
              ? undefined
              : (COSE_ALGORITHMS[String(algorithm)] ?? String(algorithm)),
          certificate: certificate ? readCertificate(certificate) : undefined,
        },
        validity: {
          issuedAt: payload.validityInfo.signed,
          validFrom: payload.validityInfo.validFrom,
          validUntil: payload.validityInfo.validUntil,
        },
      };
    }
    default:
      throw new IoWalletError(`Unsupported credential format: ${format}`);
  }
};
