import { sign, generate } from "@pagopa/io-react-native-crypto";
import { createDPopToken, DPoPPayload } from "../dpop";
import { createCryptoContextFor } from "../crypto";

const mockPayload: DPoPPayload = {
  htm: "GET",
  htu: "htu",
  jti: "jti",
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("createDPopToken", () => {
  it("should create a dpop token using ephemeral key", async () => {
    const ephemeralKeytag = `ephemeral-${Math.random()}`;
    await generate(ephemeralKeytag);
    const ephemeralContext = createCryptoContextFor(ephemeralKeytag);
    const dpop = await createDPopToken(mockPayload, ephemeralContext);

    expect(dpop).toEqual(expect.any(String));
  });
  it("should create delete the ephemeral key after the use", async () => {
    const ephemeralKeytag = `ephemeral-${Math.random()}`;
    await generate(ephemeralKeytag);
    const ephemeralContext = createCryptoContextFor(ephemeralKeytag);
    await createDPopToken(mockPayload, ephemeralContext);
    expect(sign).toBeCalledTimes(1);
  });

  it("should create a dpop token using an existing key", async () => {
    const keytag = `${Math.random()}`;
    const crypto = createCryptoContextFor(keytag);
    await generate(keytag);

    const dpop = await createDPopToken(mockPayload, crypto);
    expect(dpop).toEqual(expect.any(String));
  });
});
