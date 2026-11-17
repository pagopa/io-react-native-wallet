import { createMockSigner } from "../__fixtures__/signer";
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
    const ephemeralContext = createMockSigner();
    const dpop = await createDPopToken(mockPayload, ephemeralContext);

    expect(dpop).toEqual(expect.any(String));
  });
  it("should create delete the ephemeral key after the use", async () => {
    const ephemeralContext = createMockSigner();
    await createDPopToken(mockPayload, ephemeralContext);
    expect(ephemeralContext.sign).toHaveBeenCalledTimes(1);
  });

  it("should create a dpop token using an existing key", async () => {
    const crypto = createMockSigner();

    const dpop = await createDPopToken(mockPayload, crypto);
    expect(dpop).toEqual(expect.any(String));
  });
});
