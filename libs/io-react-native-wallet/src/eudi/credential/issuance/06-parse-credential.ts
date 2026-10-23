import { cborDecode, DataItem } from "@owf/cose";
import { hasher } from "@owf/crypto";
import { CBOR } from "@pagopa/io-react-native-iso18013";
import { decodeSdJwtSync, getClaimsSync } from "@sd-jwt/core";
import { toUint8Array } from "js-base64";
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

/**
 * Reads the Token Status List entry of a credential `status` claim,
 * from the SD-JWT VC payload or the mdoc MSO.
 */
const readStatusListEntry = (status: unknown) => {
  const statusList = (
    status as undefined | { status_list?: { idx?: unknown; uri?: unknown } }
  )?.status_list;
  return typeof statusList?.idx === "number" &&
    typeof statusList.uri === "string"
    ? { idx: statusList.idx, uri: statusList.uri }
    : undefined;
};

/**
 * Reads the `status` of the MSO of an mdoc, which the native decoder drops.
 * The MSO is the payload of the `issuerAuth` COSE_Sign1, wrapped in a tagged CBOR data item.
 * @param credential - The base64url `IssuerSigned` of the mdoc
 */
const readMsoStatus = (credential: string) => {
  try {
    const { issuerAuth } = cborDecode<{ issuerAuth?: unknown[] }>(
      toUint8Array(credential),
      { mapsAsObjects: true },
    );
    const payload = issuerAuth?.[2];
    if (!(payload instanceof Uint8Array)) return undefined;
    // The tagged data item is decoded with maps, so its bytes are decoded again as objects
    const mso = cborDecode<unknown>(payload, { unwrapTopLevelDataItem: false });
    return mso instanceof DataItem
      ? cborDecode<{ status?: unknown }>(mso.buffer, { mapsAsObjects: true })
          .status
      : undefined;
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
 * @returns The credential claims, with the unverified issuer signature details, validity and Token Status List entry
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
      return {
        claims,
        format,
        signature: {
          algorithm: typeof header.alg === "string" ? header.alg : undefined,
          certificate:
            typeof x5c[0] === "string" ? readCertificate(x5c[0]) : undefined,
        },
        status: readStatusListEntry(payload.status),
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
        status: readStatusListEntry(readMsoStatus(credential)),
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
