import { prepareRemotePresentations } from "../07-send-authorization-response";
import { createMockSigner } from "../../../../utils/__fixtures__/signer";

jest.mock("@pagopa/io-react-native-jwt", () => ({
  ...jest.requireActual("@pagopa/io-react-native-jwt"),
  thumbprint: jest.fn(async () => "thumbprint"),
}));
jest.mock("@pagopa/io-wallet-oid4vp", () => ({
  ...jest.requireActual("@pagopa/io-wallet-oid4vp"),
  extractEncryptionJwkFromJwks: jest.fn(() => ({ kid: "enc-key" })),
}));

const authRequestObject = {
  client_id: "client",
  client_metadata: { jwks: { keys: [] } },
  nonce: "nonce",
  response_uri: "https://rp.example/response",
} as unknown as Parameters<typeof prepareRemotePresentations>[1];

const mdocItem = {
  credential: "ab_cd-",
  doctype: "org.iso.18013.5.1.mDL",
  format: "mso_mdoc" as const,
  id: "mdl",
  presentationFrame: {},
  purposes: [],
  requiredDisclosures: [{ name: "family_name" }],
  signer: createMockSigner(),
} as unknown as Parameters<typeof prepareRemotePresentations>[0][number];

describe("prepareRemotePresentations - mdoc", () => {
  it("throws when mdocDeviceResponseGenerator is missing", async () => {
    await expect(
      prepareRemotePresentations([mdocItem], authRequestObject),
    ).rejects.toThrow("Missing mdocDeviceResponseGenerator");
  });

  it("calls the generator and strips the base64 padding of its result", async () => {
    const generator = jest.fn(async () => "dG9rZW4=");

    const { presentations } = await prepareRemotePresentations(
      [mdocItem],
      authRequestObject,
      undefined,
      { mdocDeviceResponseGenerator: generator },
    );

    expect(generator).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: "client",
        docType: "org.iso.18013.5.1.mDL",
        issuerSignedContent: "ab/cd+==",
        jwkThumbprint: "thumbprint",
        requestNonce: "nonce",
        responseUri: "https://rp.example/response",
        signer: mdocItem.signer,
      }),
    );
    expect(presentations).toEqual([
      expect.objectContaining({
        credentialId: "mdl",
        format: "mso_mdoc",
        vpToken: "dG9rZW4",
      }),
    ]);
  });

  it("propagates generator failures", async () => {
    const generator = jest.fn().mockRejectedValue(new Error("sign failed"));

    await expect(
      prepareRemotePresentations([mdocItem], authRequestObject, undefined, {
        mdocDeviceResponseGenerator: generator,
      }),
    ).rejects.toThrow("sign failed");
  });
});
