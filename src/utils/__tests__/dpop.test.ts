import { deleteKey, sign, generate } from "@pagopa/io-react-native-crypto";
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
    const dpop = await createDPopToken(mockPayload);

    expect(dpop).toEqual(expect.any(String));
  });
  it("should create delete the ephemeral key after the use", async () => {
    /* const dpop =  */ await createDPopToken(mockPayload);

    expect(sign).toBeCalledTimes(1);
    // @ts-ignore sign is a spied function
    const keytag = sign.mock.calls[0][1];
    expect(deleteKey).toBeCalledTimes(1);
    expect(deleteKey).toBeCalledWith(keytag);
  });

  it("should create a dpop token using an existing key", async () => {
    const keytag = `${Math.random()}`;
    const crypto = createCryptoContextFor(keytag);
    await generate(keytag);

    const dpop = await createDPopToken(mockPayload, crypto);

    expect(dpop).toEqual(expect.any(String));

    expect(sign).toBeCalledTimes(1);
    expect(sign).toBeCalledWith(expect.any(String), keytag);
    expect(deleteKey).not.toBeCalled();
  });
});
