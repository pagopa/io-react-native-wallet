import { generate, sign } from "@pagopa/io-react-native-crypto";

import { createSignerFor } from "../crypto";
import { createDPopToken, DPoPPayload } from "../dpop";

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
    const ephemeralContext = createSignerFor(ephemeralKeytag);
    const dpop = await createDPopToken(mockPayload, ephemeralContext);

    expect(dpop).toEqual(expect.any(String));
  });
  it("should create delete the ephemeral key after the use", async () => {
    const ephemeralKeytag = `ephemeral-${Math.random()}`;
    await generate(ephemeralKeytag);
    const ephemeralContext = createSignerFor(ephemeralKeytag);
    await createDPopToken(mockPayload, ephemeralContext);
    expect(sign).toHaveBeenCalledTimes(1);
  });

  it("should create a dpop token using an existing key", async () => {
    const keytag = `${Math.random()}`;
    const crypto = createSignerFor(keytag);
    await generate(keytag);

    const dpop = await createDPopToken(mockPayload, crypto);
    expect(dpop).toEqual(expect.any(String));
  });
});
