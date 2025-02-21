import { CBOR } from "@pagopa/io-react-native-cbor";
import type { JWK } from "../utils/jwk";

export const verify = async (
  token: string,
  publicKey: JWK | JWK[]
): Promise<{ mDoc: CBOR.MDOC }> => {
  // get decoded data
  const documents = await CBOR.decodeDocuments(token);
  if (!documents || documents.documents.length === 0) {
    throw new Error("Invalid mDoc");
  }
  const mDoc = documents.documents[0];
  if (!mDoc) {
    throw new Error("Invalid mDoc");
  }

  const sigKey = Array.isArray(publicKey)
    ? publicKey.find((k) => k.use === "sig")
    : publicKey;
  sigKey;

  //await COSE.verify(mDoc.issuerSigned.issuerAuth, sigKey as PublicKey);

  return {
    mDoc,
  };
};
