import { prepareRemotePresentations } from "../07-send-authorization-response";
import { prepareVpTokenMdoc } from "../../../../mdoc";
import { IoWalletError } from "../../../../utils/errors";

jest.mock("@pagopa/io-react-native-jwt", () => ({
  ...jest.requireActual("@pagopa/io-react-native-jwt"),
  thumbprint: jest.fn(async (jwk: { kid: string }) => `thumbprint-${jwk.kid}`),
}));

jest.mock("../../../../mdoc", () => ({
  prepareVpTokenMdoc: jest.fn().mockResolvedValue({ vp_token: "mdoc-token" }),
}));

jest.mock("../../../../utils/crypto", () => ({
  createCryptoContextFor: jest.fn(),
}));

type Credentials = Parameters<typeof prepareRemotePresentations>[0];

const mdocCredential: Credentials[number] = {
  credential: "issuer-signed",
  doctype: "org.iso.18013.5.1.mDL",
  format: "mso_mdoc",
  id: "mdl",
  keyTag: "key-tag",
  presentationFrame: {},
  purposes: [],
  requiredDisclosures: [{ name: "given_name", value: "Mario" }],
};

const authRequestObject = {
  clientId: "x509_hash:client",
  nonce: "request-nonce",
  responseUri: "https://rp.example/response",
};

const encKey = (kid: string) => ({
  crv: "P-256",
  kid,
  kty: "EC",
  use: "enc",
  x: "x",
  y: "y",
});

describe("prepareRemotePresentations", () => {
  beforeEach(() => jest.clearAllMocks());

  it("binds the mdoc to the thumbprint of the client_metadata encryption key", async () => {
    const result = await prepareRemotePresentations(
      [mdocCredential],
      {
        ...authRequestObject,
        clientMetadata: { jwks: { keys: [encKey("client-metadata")] } },
      },
      { jwks: { keys: [encKey("rp-conf")] } },
    );

    expect(prepareVpTokenMdoc).toHaveBeenCalledWith(
      "request-nonce",
      "thumbprint-client-metadata",
      "x509_hash:client",
      "https://rp.example/response",
      "org.iso.18013.5.1.mDL",
      "key-tag",
      expect.any(Array),
    );
    expect(result).toEqual({
      presentations: [
        {
          credentialId: "mdl",
          format: "mso_mdoc",
          requestedClaims: ["given_name"],
          vpToken: "mdoc-token",
        },
      ],
    });
  });

  it("falls back to the Relying Party configuration keys", async () => {
    await prepareRemotePresentations([mdocCredential], authRequestObject, {
      jwks: { keys: [encKey("rp-conf")] },
    });

    expect(prepareVpTokenMdoc).toHaveBeenCalledWith(
      "request-nonce",
      "thumbprint-rp-conf",
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it("throws when no encryption key is available for a mso_mdoc credential", async () => {
    await expect(
      prepareRemotePresentations([mdocCredential], authRequestObject),
    ).rejects.toThrow(IoWalletError);
    expect(prepareVpTokenMdoc).not.toHaveBeenCalled();
  });
});
