import { CBOR, COSE, ISO18013 } from "@pagopa/io-react-native-cbor";
import type { JWK } from "../utils/jwk";
import type { PublicKey } from "@pagopa/io-react-native-crypto";
import { b64utob64 } from "jsrsasign";
import {
  convertCertToPem,
  getSigningJwk,
  parsePublicKey,
} from "../utils/crypto";
import { type Presentation } from "../credential/presentation/types";
import { base64ToBase64Url } from "../utils/string";

export const verify = async (
  token: string,
  _: JWK | JWK[]
): Promise<{ issuerSigned: CBOR.IssuerSigned }> => {
  // get decoded data
  const issuerSigned = await CBOR.decodeIssuerSigned(token);
  if (!issuerSigned) {
    throw new Error("Invalid mDoc");
  }

  const cert = issuerSigned.issuerAuth.unprotectedHeader[0]?.keyId;
  if (!cert) throw new Error("Certificate not present in credential");

  const pemcert = convertCertToPem(b64utob64(cert));
  const publickey = parsePublicKey(pemcert);
  if (!publickey) throw new Error("Certificate not present in credential");

  const jwk = getSigningJwk(publickey);

  jwk.x = b64utob64(jwk.x!);
  jwk.y = b64utob64(jwk.y!);

  const signatureCorrect = await COSE.verify(
    b64utob64(issuerSigned.issuerAuth.rawValue!),
    jwk as PublicKey
  ).catch(() => false);
  if (!signatureCorrect) throw new Error("Invalid mDoc signature");

  return { issuerSigned };
};

export const prepareVpTokenMdoc = async (
  requestNonce: string,
  generatedNonce: string,
  clientId: string,
  responseUri: string,
  docType: string,
  keyTag: string,
  [verifiableCredential, requestedClaims, _]: Presentation
): Promise<{
  vp_token: string;
}> => {
  /* verifiableCredential is a IssuerSigned structure */
  const documents = [
    {
      issuerSignedContent: verifiableCredential,
      alias: keyTag,
      docType,
    },
  ];

  /* we map each requested claim as for ex. { "org.iso.18013.5.1.mDL": { "org.iso.18013.5.1": { <claim-name>: true, ... }}} for selective disclosure */
  const fieldRequestedAndAccepted = JSON.stringify({
    [docType]: requestedClaims.reduce<Record<string, unknown>>(
      (acc, { name, namespace }) => {
        if (namespace) {
          acc[namespace] ??= {};
          const existingNamespace = acc[namespace] as Record<string, boolean>;
          existingNamespace[name] = true;
        } else {
          acc[name] = true;
        }
        return acc;
      },
      {} as Record<string, unknown>
    ),
  });

  /* clientId,responseUri,requestNonce are retrieved by Auth Request Object */
  /* create DeviceResponse as { documents: { docType, issuerSigned, deviceSigned }, version, status } */
  const vp_token = await ISO18013.generateOID4VPDeviceResponse(
    clientId,
    responseUri,
    requestNonce,
    generatedNonce,
    documents,
    fieldRequestedAndAccepted
  );

  return {
    vp_token: base64ToBase64Url(vp_token),
  };
};
