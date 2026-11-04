import { prepareRemotePresentations } from "../07-send-authorization-response";
import { createMockSigner } from "../../../../utils/__fixtures__/signer";

const authRequestObject = {
  clientId: "client",
  nonce: "nonce",
  responseUri: "https://rp.example/response",
};

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
      { mdocDeviceResponseGenerator: generator },
    );

    expect(generator).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: "client",
        docType: "org.iso.18013.5.1.mDL",
        issuerSignedContent: "ab/cd+==",
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
      prepareRemotePresentations([mdocItem], authRequestObject, {
        mdocDeviceResponseGenerator: generator,
      }),
    ).rejects.toThrow("sign failed");
  });
});
