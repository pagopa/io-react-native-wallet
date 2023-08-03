// mock react native bridged modules

import { sha256 } from "js-sha256";
export * from "@pagopa/io-react-native-jwt";
export const sha256ToBase64 = (v: string) =>
  removePadding(hexToBase64(sha256(v)));

function hexToBase64(hexstring: string) {
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
