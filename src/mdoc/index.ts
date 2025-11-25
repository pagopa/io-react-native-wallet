import { CBOR, COSE } from "@pagopa/io-react-native-iso18013";
import { b64utob64 } from "jsrsasign";
import {
  type CertificateValidationResult,
  type PublicKey,
  verifyCertificateChain,
  type X509CertificateOptions,
} from "@pagopa/io-react-native-crypto";
import { MissingX509CertsError, X509ValidationError } from "../trust/errors";
import { IoWalletError } from "../utils/errors";
import { convertBase64DerToPem, getSigninJwkFromCert } from "../utils/crypto";

export * from "./utils";

export const verify = async (
  token: string,
  x509CertRoot: string,
  x509CertVerificationOptions?: X509CertificateOptions
): Promise<{ issuerSigned: CBOR.IssuerSigned }> => {
  // get decoded data
  const issuerSigned = await CBOR.decodeIssuerSigned(token);

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
  console.log(x5chain);
  // Verify the x5chain
  await verifyX5chain(x5chain, x509CertRoot, x509CertVerificationOptions);

  const coseSign1 = issuerSigned.issuerAuth.rawValue;

  if (!coseSign1) {
    throw new IoWalletError("Missing coseSign1");
  }
  // Once the x5chain is verified, the signatures verification can be performed
  await verifyMdocSignature(coseSign1, x5chain[0]!);

  return { issuerSigned };
};

/**
 * This function checks whether the x509 certificate chain is valid against a specified Certificate Authority (CA)
 *
 * @param x5chain The mdoc's x509 certificate chain
 * @param x509CertRoot The Trust Anchor CA
 * @param options Options for certificate validation
 */
const verifyX5chain = async (
  x5chain: string[],
  x509CertRoot: string,
  options: X509CertificateOptions = {
    connectTimeout: 10000,
    readTimeout: 10000,
    requireCrl: true,
  }
) => {
  const x509ValidationResult: CertificateValidationResult =
    await verifyCertificateChain(x5chain, x509CertRoot, options);

  if (!x509ValidationResult.isValid) {
    throw new X509ValidationError(
      `X.509 certificate chain validation failed. Status: ${x509ValidationResult.validationStatus}. Error: ${x509ValidationResult.errorMessage}`,
      {
        x509ValidationStatus: x509ValidationResult.validationStatus,
        x509ErrorMessage: x509ValidationResult.errorMessage,
      }
    );
  }
};
/**
 * This function verifies that the signature is valid for the given certificate.
 * If not, it throws an error
 *
 * @param coseSign1 The COSE-Sign1 object encoded in base64 or base64url
 * @param cert The `x5chain`'s leaf certificate
 */
const verifyMdocSignature = async (coseSign1: string, cert: string) => {
  const pemcert = convertBase64DerToPem(cert);
  const jwk = getSigninJwkFromCert(pemcert);

  jwk.x = b64utob64(jwk.x!);
  jwk.y = b64utob64(jwk.y!);

  const signatureCorrect = await COSE.verify(coseSign1, jwk as PublicKey);

  if (!signatureCorrect) throw new Error("Invalid mDoc signature");
};
