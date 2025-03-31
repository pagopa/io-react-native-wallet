import { CBOR, COSE } from "@pagopa/io-react-native-cbor";
import type { JWK } from "../utils/jwk";
import type { PublicKey } from "@pagopa/io-react-native-crypto";
import { b64utob64 } from "jsrsasign";
import { derToPem, getSigningJwk, parsePublicKey } from "../utils/crypto";

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

  const pemcert = derToPem(b64utob64(cert));
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
