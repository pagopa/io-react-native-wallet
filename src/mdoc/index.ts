import { CBOR } from "@pagopa/io-react-native-cbor";
import type { JWK } from "../utils/jwk";
import { b64utob64 } from "jsrsasign";
import {
  convertCertToPem,
  getSigningJwk,
  parsePublicKey,
} from "../utils/crypto";

export const MDOC_DEFAULT_NAMESPACE = "org.iso.18013.5.1";

export const verify = async (
  token: string,
  _: JWK | JWK[]
): Promise<{ issuerSigned: CBOR.IssuerSigned }> => {
  // get decoded data
  const issuerSigned = await CBOR.decodeIssuerSigned(token);

  if (!issuerSigned) {
    throw new Error("Invalid mDoc");
  }

  const cert = issuerSigned.issuerAuth.unprotectedHeader[0]?.x5chain?.[0];
  if (!cert) throw new Error("Certificate not present in credential");

  const pemcert = convertCertToPem(b64utob64(cert));
  const publickey = parsePublicKey(pemcert);
  if (!publickey) throw new Error("Certificate not present in credential");

  const jwk = getSigningJwk(publickey);

  jwk.x = b64utob64(jwk.x!);
  jwk.y = b64utob64(jwk.y!);

  console.info(b64utob64(issuerSigned.issuerAuth.rawValue!));
  // TODO: remove this comment
  // const signatureCorrect = await COSE.verify(
  //   b64utob64(issuerSigned.issuerAuth.rawValue!),
  //   jwk as PublicKey
  // ).catch((e: any) => console.error(e));
  // if (!signatureCorrect) throw new Error("Invalid mDoc signature");

  return { issuerSigned };
};
