import { decode, verify } from "@pagopa/io-react-native-jwt";

import { InvalidRequestObjectError } from "../../credential/presentation/common/errors";
import { getJwkFromCertificateChain } from "../../utils/crypto";
import { RequestObject, RequestObjectHeader } from "./types";
import { getCertificateHash, getCertificateSanDnsNames } from "./utils";

export interface VerifiedRequestObject {
  /** The certificate chain of the Verifier, leaf first */
  certificateChain: [string, ...string[]];
  requestObject: RequestObject;
}

export interface VerifyRequestObjectParams {
  /** The `client_id` of the Authorization Request URI */
  clientId: string;
  /** The nonce sent to the Verifier when the Request Object was fetched with POST */
  walletNonce?: string;
  /** If true, the Request Object is only parsed and no signature validation is performed.
   * This can be useful to avoid verifying the signature twice when the trust evaluation
   * (see `evaluateVerifierTrust`) follows this function.
   * @default false 
   */
  parsingOnly?: boolean
}

/**
 * Verifies a signed Request Object (OpenID4VP 1.0, Section 5) and authenticates the Verifier
 * with its Client Identifier Prefix (Section 5.9.3), as required by HAIP:
 * - `x509_san_dns`: the leaf certificate has the Client Identifier as a DNS name SAN;
 * - `x509_hash`: the Client Identifier is the hash of the leaf certificate.
 * 
 * The Request Object must be signed with the leaf certificate key, have the same `client_id`
 * of the Authorization Request URI and, when fetched with POST, the same `wallet_nonce`.
 * 
 * **Note:** when `parsingOnly` is true, signature verification is skipped and `evaluateVerifierTrust`
 * must be invoked to determine whether the Request Object and the Verifier can be trusted.
 * 
 * @param requestObjectJwt - The signed Request Object
 * @returns The verified Request Object and the Verifier certificate chain
 * @throws {InvalidRequestObjectError} If the Request Object or the Verifier are not valid
 */
export const verifyRequestObject = async (
  requestObjectJwt: string,
  { clientId, walletNonce, parsingOnly = false }: VerifyRequestObjectParams,
): Promise<VerifiedRequestObject> => {
  const { payload, protectedHeader } = (() => {
    try {
      return decode(requestObjectJwt);
    } catch {
      throw new InvalidRequestObjectError(
        "The Request Object is not a valid JWT",
      );
    }
  })();

  const header = RequestObjectHeader.safeParse(protectedHeader);
  if (!header.success) {
    throw new InvalidRequestObjectError(
      "Invalid Request Object header",
      header.error.message,
    );
  }
  const requestObject = RequestObject.safeParse(payload);
  if (!requestObject.success) {
    throw new InvalidRequestObjectError(
      "Invalid Request Object",
      requestObject.error.message,
    );
  }
  const { client_id, transaction_data, wallet_nonce } = requestObject.data;

  if (client_id !== clientId) {
    throw new InvalidRequestObjectError(
      "The Request Object client_id does not match the Authorization Request one",
    );
  }
  if (walletNonce && wallet_nonce !== walletNonce) {
    throw new InvalidRequestObjectError(
      "The Request Object wallet_nonce does not match the one sent by the wallet",
    );
  }
  if (transaction_data) {
    throw new InvalidRequestObjectError("Transaction data are not supported");
  }

  const { x5c } = header.data;
  if (!x5c) {
    throw new InvalidRequestObjectError(
      "The Request Object has no certificate chain (x5c)",
    );
  }
  verifyClientIdentifier(client_id, x5c[0]);

  if (parsingOnly === false) {
    await verify(requestObjectJwt, await getJwkFromCertificateChain(x5c)).catch(
      (e) => {
        throw new InvalidRequestObjectError(
          "The Request Object verification failed",
          e instanceof Error ? e.message : String(e),
        );
      },
    );
  }

  return { certificateChain: x5c, requestObject: requestObject.data };
};

/**
 * Authenticates the Client Identifier with the leaf certificate of the Request Object.
 */
const verifyClientIdentifier = (clientId: string, leafCertificate: string) => {
  const separatorIndex = clientId.indexOf(":");
  const prefix = clientId.slice(0, separatorIndex);
  const identifier = clientId.slice(separatorIndex + 1);

  switch (prefix) {
    case "x509_hash":
      if (getCertificateHash(leafCertificate) !== identifier) {
        throw new InvalidRequestObjectError(
          "The x509_hash Client Identifier does not match the leaf certificate",
        );
      }
      return;
    case "x509_san_dns":
      if (!getCertificateSanDnsNames(leafCertificate).includes(identifier)) {
        throw new InvalidRequestObjectError(
          "The x509_san_dns Client Identifier is not a DNS name of the leaf certificate",
        );
      }
      return;
    default:
      throw new InvalidRequestObjectError(
        `Unsupported Client Identifier: ${clientId}`,
      );
  }
};
