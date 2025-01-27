import { Base64 as mockBase64 } from "js-base64";
import { sha256 as mockSha256 } from "js-sha256";
import type { JWK } from "../../../src/utils/jwk";

export { SignJWT } from "@pagopa/io-react-native-jwt";

export const sha256ToBase64 = async (toHash: string) =>
  Promise.resolve(removePadding(mockHexToBase64(mockSha256(toHash))));

function mockHexToBase64(hexstring: string) {
  const x = hexstring.match(/\w{2}/g) || [];
  const g = x
    .map(function (a) {
      return String.fromCharCode(parseInt(a, 16));
    })
    .join("");
  return btoa(g);
}

export const thumbprint = (_: any) => sha256ToBase64(JSON.stringify(_));

export function removePadding(encoded: string): string {
  // eslint-disable-next-line no-div-regex
  return encoded.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export const decode = (jwt: string) => {
  const [encodedHeader, encodedPayload, _signature] = jwt.split(".");
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
    `Mock: invalid signature for kid: '${decoded.protectedHeader.kid}'`
  );
};

export const decodeBase64 = (value: string) => mockBase64.decode(value);
export const encodeBase64 = (value: string) => mockBase64.encode(value, true);
