import type { JWK } from "src/utils/jwk";

import { Base64 as mockBase64 } from "js-base64";

import { sha256ToBase64Url } from "../../../src/utils/hash";

export { JWT } from "@pagopa/io-react-native-jwt";

export const thumbprint = (jwk: JWK) => {
  const canonical = {
    crv: jwk.crv,
    kty: jwk.kty,
    x: jwk.x,
    y: jwk.y,
  };
  const canonicalJson = JSON.stringify(canonical);
  return Promise.resolve(sha256ToBase64Url(canonicalJson));
};

export const decode = (jwt: string) => {
  const [encodedHeader, encodedPayload] = jwt.split(".");
  const payload = JSON.parse(atob(encodedPayload as string));
  const protectedHeader = JSON.parse(atob(encodedHeader as string));
  return { payload, protectedHeader };
};
export const verify = (jwt: string, _: JWK | JWK[]) => {
  const decoded = decode(jwt);
  // for the sake of a mocked unit test, we accept the signature if the jwt declares the same kid as the jwk
  if (Array.isArray(_)) {
    if (_.find((e) => e.kid === decoded.protectedHeader.kid)) {
      return decoded;
    }
  } else if (_.kid && decoded.protectedHeader.kid === _.kid) {
    return decoded;
  }
  throw new Error(
    `Mock: invalid signature for kid: '${decoded.protectedHeader.kid}'`,
  );
};

export const decodeBase64 = (value: string) => mockBase64.decode(value);
export const encodeBase64 = (value: string) => mockBase64.encode(value, true);
