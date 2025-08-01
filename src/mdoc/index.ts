import { CBOR, COSE } from "@pagopa/io-react-native-iso18013";
import { b64utob64 } from "jsrsasign";
import {
  verifyCertificateChain,
  type CertificateValidationResult,
  type PublicKey,
  type X509CertificateOptions,
} from "@pagopa/io-react-native-crypto";
import { MissingX509CertsError, X509ValidationError } from "../trust/errors";
import { IoWalletError } from "../utils/errors";
import { convertBase64DerToPem, getSigninJwkFromCert } from "../utils/crypto";

export const verify = async (
  token: string,
  x509CertRoot: string
): Promise<{ issuerSigned: CBOR.IssuerSigned }> => {
  // get decoded data
  const issuerSigned = await CBOR.decodeIssuerSigned(token);

  if (!issuerSigned) {
    throw new IoWalletError("Invalid mDoc");
  }

  if (!issuerSigned.issuerAuth.unprotectedHeader.x5chain) {
    throw new MissingX509CertsError("Missing x509 certificates");
  }
  // Verify the x5chain
  await verifyX5chain(issuerSigned, x509CertRoot);
  // Once the x5chain is verified, the signatures verification can be performed
  await verifySignatures(issuerSigned);

  return { issuerSigned };
};

/**
 * This function checks whether the x5c certificate chain is valid against a specified Certificate Authority (CA)
 *
 * @param issuerSigned The decoded mdoc
 * @param x509CertRoot The Trust Anchor CA
 * @param options Options for certificate validation
 */
const verifyX5chain = async (
  issuerSigned: CBOR.IssuerSigned,
  x509CertRoot: string,
  options: X509CertificateOptions = {
    connectTimeout: 10000,
    readTimeout: 10000,
    requireCrl: true,
  }
) => {
  const x5chain =
    issuerSigned.issuerAuth.unprotectedHeader.x5chain!.map(b64utob64);
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
 * This function verifies that the signature is valid for all certificates in the x5c chain.
 * If not, it throws an error
 *
 * @param issuerSigned The decoded mdoc
 */
const verifySignatures = async (issuerSigned: CBOR.IssuerSigned) => {
  await Promise.all(
    issuerSigned.issuerAuth.unprotectedHeader.x5chain!.map(async (cert) => {
      const pemcert = convertBase64DerToPem(b64utob64(cert));
      const jwk = getSigninJwkFromCert(pemcert);

      jwk.x = b64utob64(jwk.x!);
      jwk.y = b64utob64(jwk.y!);

      console.info(b64utob64(issuerSigned.issuerAuth.rawValue!));

      const signatureCorrect = await COSE.verify(
        b64utob64(issuerSigned.issuerAuth.rawValue!),
        jwk as PublicKey
      ).catch((e: any) => console.error(e));

      if (!signatureCorrect) throw new Error("Invalid mDoc signature");
    })
  );
};
