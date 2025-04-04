import {
  deleteKey,
  generate,
  getPublicKey,
  sign,
} from "@pagopa/io-react-native-crypto";

import {
  createCryptoContextFor,
  withEphemeralKey,
  convertCertToPem,
} from "../crypto";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useEphemeralKey", () => {
  it("should delete key on failure", async () => {
    const failingFn = () => Promise.reject("fail");

    const p = withEphemeralKey(failingFn);

    await expect(p).rejects.toEqual("fail");

    expect(generate).toBeCalledTimes(1);
    expect(deleteKey).toBeCalledTimes(1);
  });

  it("should delete key on success", async () => {
    const fn = () => Promise.resolve("ok");

    const result = await withEphemeralKey(fn);

    expect(result).toBe("ok");

    expect(generate).toBeCalledTimes(1);
    expect(deleteKey).toBeCalledTimes(1);
  });

  it("should delete only after the procedure has ended", async () => {
    let a: number = 0,
      b: number = -1;
    const fn = () =>
      new Promise((ok) => setTimeout((_) => ok((a = Date.now())), 1000));

    (deleteKey as jest.Mock).mockImplementationOnce(
      (_) => new Promise((ok) => setTimeout(() => ok((b = Date.now())), 100))
    );

    await withEphemeralKey(fn);

    expect(generate).toBeCalledTimes(1);
    expect(deleteKey).toBeCalledTimes(1);

    expect(a).toBeLessThan(b);
  });
});

// Mocks
jest.mock("@pagopa/io-react-native-crypto", () => ({
  getPublicKey: jest.fn(),
  sign: jest.fn(),
  generate: jest.fn(),
  deleteKey: jest.fn(),
}));

jest.mock("@pagopa/io-react-native-jwt", () => {
  // Bring in everything from the real module
  const originalModule = jest.requireActual("@pagopa/io-react-native-jwt");

  return {
    // Spread all actual exports (including removePadding)
    ...originalModule,

    // Then override only the exports you want to explicitly mock
    thumbprint: jest.fn().mockResolvedValue("mockedThumbprint"),
    // removePadding: we do NOT override it here, so it stays real
  };
});

jest.mock("react-native-uuid", () => ({
  v4: jest.fn().mockReturnValue("mocked-uuid"),
}));

describe("createCryptoContextFor", () => {
  const keytag = "my-test-keytag";

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return an object with getPublicKey and getSignature methods", () => {
    const context = createCryptoContextFor(keytag);
    expect(typeof context.getPublicKey).toBe("function");
    expect(typeof context.getSignature).toBe("function");
  });

  describe("getPublicKey()", () => {
    it("should call getPublicKey from io-react-native-crypto and return a JWK with a kid (thumbprint)", async () => {
      // Mock the getPublicKey call
      (getPublicKey as jest.Mock).mockResolvedValue({
        kty: "RSA",
        e: "2R8dYXmikJkbyKE8C/x8Lvkah4yrXGCB6g8bX8zggDs=",
        n: "some-base64-encoded-modulus",
      });

      const context = createCryptoContextFor(keytag);
      const jwk = await context.getPublicKey();

      expect(getPublicKey).toHaveBeenCalledWith(keytag);
      // We expect fixBase64WithLeadingZero to have properly returned a JWK object with base64-url encoded properties
      expect(jwk).toMatchObject({
        kty: "RSA",
        e: "2R8dYXmikJkbyKE8C_x8Lvkah4yrXGCB6g8bX8zggDs",
        n: expect.any(String),
        kid: "mockedThumbprint", // because we mock thumbprint
      });
    });

    it("should apply fixBase64WithLeadingZero and remove leading zeros from e/n if present", async () => {
      // Leading zero in base64 can produce "00" in hex
      // Provide a base64 that decodes and start with 0x00.
      (getPublicKey as jest.Mock).mockResolvedValue({
        kty: "RSA",
        x: "ANkfHWF5opCZG8ihPAv8fC75GoeMq1xggeoPG1/M4IA7=", // Fake base64 that might decode to a "00" leading hex
        y: "BBBQ",
      });

      const context = createCryptoContextFor(keytag);
      const jwk = await context.getPublicKey();

      // Just ensure it does not break and it calls removeLeadingZeroAndParseb64u
      expect(jwk.x).toBe("2R8dYXmikJkbyKE8C_x8Lvkah4yrXGCB6g8bX8zggDs");
      expect(jwk.y).toBeTruthy();
    });
  });

  describe("getSignature()", () => {
    it("should call sign from io-react-native-crypto with the given value and keytag", async () => {
      (sign as jest.Mock).mockResolvedValue("mockedSignature");

      const context = createCryptoContextFor(keytag);
      const signature = await context.getSignature("myMessage");

      expect(sign).toHaveBeenCalledWith("myMessage", keytag);
      expect(signature).toBe("mockedSignature");
    });
  });
});

describe("convertCertToPem", () => {
  it("should convert a certificate string to PEM format", () => {
    const certString = "MIIDdzCCAl+gAwIBAgIEUeEDszANBgkqh...";
    const pem = convertCertToPem(certString);
    expect(pem).toContain("-----BEGIN CERTIFICATE-----");
    expect(pem).toContain("-----END CERTIFICATE-----");
    expect(pem).toContain(certString);
  });
});
