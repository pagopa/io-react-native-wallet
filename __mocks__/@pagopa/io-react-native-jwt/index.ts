import { sha256 as mockSha256 } from "js-sha256";
import type { JWK } from "src/utils/jwk";

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

function removePadding(encoded: string): string {
  // eslint-disable-next-line no-div-regex
  return encoded.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export const decode = (jwt: string) => {
  const [encodedHeader, encodedPayload, _signature] = jwt.split(".");
  const payload = JSON.parse(atob(encodedPayload as string));
  const protectedHeader = JSON.parse(atob(encodedHeader as string));
  return { payload, protectedHeader };
};
export const verify = (jwt: string, _: JWK) => decode(jwt);

export const decodeBase64 = (value: string) => atob(value);
export const encodeBase64 = (value: string) => removePadding(btoa(value));
