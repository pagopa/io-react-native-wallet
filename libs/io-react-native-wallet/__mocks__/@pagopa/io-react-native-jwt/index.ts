import type { JWK } from "src/utils/jwk";

import { Base64 as mockBase64 } from "js-base64";
import { sha256 as mockSha256 } from "js-sha256";

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

export const thumbprint = (jwk: JWK) => {
  const canonical = {
    crv: jwk.crv,
    kty: jwk.kty,
    x: jwk.x,
    y: jwk.y,
  };
  const canonicalJson = JSON.stringify(canonical);
  return sha256ToBase64(canonicalJson);
};

export function removePadding(encoded: string): string {
  return encoded.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

// The DER to JOSE conversion is performed by a native module, the signature is kept as is
export const derToJose = async (signature: string) => removePadding(signature);

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

const ES_ALG_BY_CRV: Record<string, string> = {
  "P-256": "ES256",
  "P-384": "ES384",
  "P-521": "ES512",
};

// Minimal in-memory counterpart of the JWT builder, the signature is kept as is (see derToJose)
export class JWT {
  private header: Record<string, unknown> = {};
  private payload: Record<string, unknown> = {};

  constructor(private readonly publicKey: JWK) {}

  setAudience(audience: string | string[]) {
    return this.setPayload({ aud: audience });
  }

  setExpirationTime(input: number | string) {
    return this.setPayload({ exp: this.resolveTime(input) });
  }

  setIssuedAt(input?: number) {
    return this.setPayload({ iat: input ?? Math.floor(Date.now() / 1000) });
  }

  setIssuer(issuer: string) {
    return this.setPayload({ iss: issuer });
  }

  setJti(jwtId: string) {
    return this.setPayload({ jti: jwtId });
  }

  setNotBefore(input: number | string) {
    return this.setPayload({ nbf: this.resolveTime(input) });
  }

  setPayload(payload: Record<string, unknown>) {
    this.payload = { ...this.payload, ...payload };
    return this;
  }

  setProtectedHeader(header: Record<string, unknown>) {
    this.header = header;
    return this;
  }

  setSubject(subject: string) {
    return this.setPayload({ sub: subject });
  }

  async sign(signFn: (value: string) => Promise<string>) {
    const unsigned = [{ ...this.header, alg: this.getAlg() }, this.payload]
      .map((e) => encodeBase64(JSON.stringify(e)))
      .join(".");
    return `${unsigned}.${removePadding(await signFn(unsigned))}`;
  }

  private getAlg() {
    const { alg, crv, kty } = this.publicKey;
    return kty === "EC" && crv ? ES_ALG_BY_CRV[crv] : alg;
  }

  // A number is a timestamp, a string is a time span added to the current timestamp
  private resolveTime(input: number | string) {
    if (typeof input === "number") return input;
    const [, value, unit] =
      /^(\d+|\d+\.\d+) ?([a-z]+)$/i.exec(input.trim()) ?? [];
    const unitSeconds: Record<string, number> = {
      d: 86400,
      h: 3600,
      m: 60,
      s: 1,
      w: 604800,
      y: 31557600,
    };
    const seconds = (unit && unitSeconds[unit.charAt(0).toLowerCase()]) || 0;
    return (
      Math.floor(Date.now() / 1000) +
      Math.round(parseFloat(value ?? "0") * seconds)
    );
  }
}
