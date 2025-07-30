import { CBOR, COSE } from "@pagopa/io-react-native-iso18013";
import type { JWK } from "../utils/jwk";
import { b64utob64 } from "jsrsasign";
import {
  convertCertToPem,
  getSigningJwk,
  parsePublicKey,
} from "../utils/crypto";
import {
  verifyCertificateChain,
  type CertificateValidationResult,
  type PublicKey,
} from "@pagopa/io-react-native-crypto";
import { getTrustAnchorX509Certificate } from "../trust/utils";
import {
  FederationError,
  MissingX509CertsError,
  X509ValidationError,
} from "../trust/errors";
import { getTrustAnchorEntityConfiguration } from "../trust/build-chain";
import { IoWalletError } from "../utils/errors";

export const verify = async (
  token: string,
  _: JWK | JWK[],
  authority_hints?: string[]
): Promise<{ issuerSigned: CBOR.IssuerSigned }> => {
  // get decoded data
  const issuerSigned = await CBOR.decodeIssuerSigned(token);

  if (!issuerSigned) {
    throw new IoWalletError("Invalid mDoc");
  }
  if (!authority_hints?.length) {
    throw new FederationError("Missing authority_hints");
  }
  if (!issuerSigned.issuerAuth.unprotectedHeader.x5chain) {
    throw new MissingX509CertsError("Missing x509 certificates");
  }

  const cert = issuerSigned.issuerAuth.unprotectedHeader.x5chain[0];

  await Promise.all(
    authority_hints.map(async (auth_hint) => {
      const trustAnchor = await getTrustAnchorEntityConfiguration(auth_hint);
      const x509TrustAnchorCertBase64 =
        getTrustAnchorX509Certificate(trustAnchor);
      const x509ValidationResult: CertificateValidationResult =
        await verifyCertificateChain(
          issuerSigned.issuerAuth.unprotectedHeader.x5chain!.map(b64utob64),
          x509TrustAnchorCertBase64,
          {
            connectTimeout: 10000, // temp
            readTimeout: 10000, // temp
            requireCrl: true, // temp
          }
        );

      if (!x509ValidationResult.isValid) {
        throw new X509ValidationError(
          `X.509 certificate chain validation failed for ${auth_hint}. Status: ${x509ValidationResult.validationStatus}. Error: ${x509ValidationResult.errorMessage}`,
          {
            x509ValidationStatus: x509ValidationResult.validationStatus,
            x509ErrorMessage: x509ValidationResult.errorMessage,
          }
        );
      }
    })
  );

  if (!cert) throw new Error("Certificate not present in credential");

  const pemcert = convertCertToPem(b64utob64(cert));
  const publickey = parsePublicKey(pemcert);
  if (!publickey) throw new Error("Certificate not present in credential");

  const jwk = getSigningJwk(publickey);

  jwk.x = b64utob64(jwk.x!);
  jwk.y = b64utob64(jwk.y!);

  console.info(b64utob64(issuerSigned.issuerAuth.rawValue!));

  const signatureCorrect = await COSE.verify(
    b64utob64(issuerSigned.issuerAuth.rawValue!),
    jwk as PublicKey
  ).catch((e: any) => console.error(e));
  if (!signatureCorrect) throw new Error("Invalid mDoc signature");

  return { issuerSigned };
};
