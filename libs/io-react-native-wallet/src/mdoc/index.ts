import { b64utob64 } from "jsrsasign";

import type { CborDecoder, CborVerifier, IssuerSigned } from "./types";

import { MissingX509CertsError } from "../trust/common/errors";
import {
  convertBase64DerToPem,
  getSigninJwkFromCert,
  type PublicKey,
} from "../utils/crypto";
import { IoWalletError } from "../utils/errors";
import { type CertificateChainVerifier, verifyX509Chain } from "../utils/x509";
export * from "./types";
export * from "./utils";

export const verify = async (
  token: string,
  x509CertRoot: string,
  {
    cborDecoder,
    cborVerifier,
    certificateChainVerifier,
  }: {
    cborDecoder: CborDecoder;
    cborVerifier: CborVerifier;
    certificateChainVerifier: CertificateChainVerifier;
  },
): Promise<{ issuerSigned: IssuerSigned }> => {
  // get decoded data
  const issuerSigned = await cborDecoder.decodeIssuerSigned(token);

  if (!issuerSigned) {
    throw new IoWalletError("Invalid mDoc");
  }

  if (
    !issuerSigned.issuerAuth.unprotectedHeader?.x5chain &&
    (!Array.isArray(issuerSigned.issuerAuth.unprotectedHeader.x5chain) ||
      issuerSigned.issuerAuth.unprotectedHeader.x5chain.length === 0)
  ) {
    throw new MissingX509CertsError("Missing x509 certificates");
  }
  const x5chain =
    issuerSigned.issuerAuth.unprotectedHeader.x5chain.map(b64utob64);
  // Verify the x5chain
  await verifyX509Chain(x5chain, x509CertRoot, certificateChainVerifier);

  const coseSign1 = issuerSigned.issuerAuth.rawValue;

  if (!coseSign1) {
    throw new IoWalletError("Missing coseSign1");
  }

  const firstCert = x5chain[0];

  if (!firstCert) {
    throw new IoWalletError("x5chain is empty, cannot verify signature");
  }

  // Once the x5chain is verified, the signatures verification can be performed
  await verifyMdocSignature(coseSign1, firstCert, cborVerifier);

  return { issuerSigned };
};

/**
 * This function verifies that the signature is valid for the given certificate.
 * If not, it throws an error
 *
 * @param coseSign1 The COSE-Sign1 object encoded in base64 or base64url
 * @param cert The `x5chain`'s leaf certificate
 * @param cborVerifier The COSE-Sign1 verifier provided by the consumer
 */
const verifyMdocSignature = async (
  coseSign1: string,
  cert: string,
  cborVerifier: CborVerifier,
) => {
  const pemcert = convertBase64DerToPem(cert);
  const jwk = getSigninJwkFromCert(pemcert);

  if (!jwk.x || !jwk.y) {
    throw new IoWalletError(
      "Missing x or y coordinate in the certificate's public key",
    );
  }

  jwk.x = b64utob64(jwk.x);
  jwk.y = b64utob64(jwk.y);

  const signatureCorrect = await cborVerifier(coseSign1, jwk as PublicKey);

  if (!signatureCorrect) throw new Error("Invalid mDoc signature");
};
