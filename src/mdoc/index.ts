import { CBOR, COSE } from "@pagopa/io-react-native-iso18013";
import type { JWK } from "../utils/jwk";
import { b64utob64 } from "jsrsasign";
import {
  verifyCertificateChain,
  type CertificateValidationResult,
  type PublicKey,
  type X509CertificateOptions,
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
  issuerKeys: JWK[],
  authorityHints?: string[]
): Promise<{ issuerSigned: CBOR.IssuerSigned }> => {
  // get decoded data
  const issuerSigned = await CBOR.decodeIssuerSigned(token);

  if (!issuerSigned) {
    throw new IoWalletError("Invalid mDoc");
  }
  if (!authorityHints?.length) {
    throw new FederationError("Missing authorityHints");
  }
  if (!issuerSigned.issuerAuth.unprotectedHeader.x5chain) {
    throw new MissingX509CertsError("Missing x509 certificates");
  }

  await verifyTrustChain(authorityHints, issuerSigned);
  await verifySignatures(issuerKeys, issuerSigned);

  return { issuerSigned };
};

const verifySignatures = (issuerKeys: JWK[], issuerSigned: CBOR.IssuerSigned) =>
  Promise.all(
    issuerKeys.map(async (jwk) => {
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

const verifyTrustChain = (
  authorityHints: string[],
  issuerSigned: CBOR.IssuerSigned,
  options: X509CertificateOptions = {
    connectTimeout: 10000,
    readTimeout: 10000,
    requireCrl: true,
  }
) =>
  Promise.all(
    authorityHints.map(async (authHint) => {
      const trustAnchor = await getTrustAnchorEntityConfiguration(authHint);
      const x509TrustAnchorCertBase64 =
        getTrustAnchorX509Certificate(trustAnchor);
      const x509ValidationResult: CertificateValidationResult =
        await verifyCertificateChain(
          issuerSigned.issuerAuth.unprotectedHeader.x5chain!.map(b64utob64),
          x509TrustAnchorCertBase64,
          options
        );

      if (!x509ValidationResult.isValid) {
        throw new X509ValidationError(
          `X.509 certificate chain validation failed for ${authHint}. Status: ${x509ValidationResult.validationStatus}. Error: ${x509ValidationResult.errorMessage}`,
          {
            x509ValidationStatus: x509ValidationResult.validationStatus,
            x509ErrorMessage: x509ValidationResult.errorMessage,
          }
        );
      }
    })
  );
