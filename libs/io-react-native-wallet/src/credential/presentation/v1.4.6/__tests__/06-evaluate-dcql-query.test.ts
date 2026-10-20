import type { DcqlQuery } from "dcql";

import { evaluateDcqlQuery } from "../06-evaluate-dcql-query";
import { createMockCborDecoder } from "../../../../utils/__fixtures__/cbor";
import { createMockSigner } from "../../../../utils/__fixtures__/signer";

describe("evaluateDcqlQuery - mdoc", () => {
  const mdocQuery: DcqlQuery.Input = {
    credentials: [
      {
        claims: [{ path: ["org.iso.18013.5.1", "family_name"] }],
        format: "mso_mdoc",
        id: "mdl",
        meta: { doctype_value: "org.iso.18013.5.1.mDL" },
      },
    ],
  };

  it("evaluates mdoc credentials using the injected decoder", async () => {
    const cborDecoder = createMockCborDecoder();
    cborDecoder.decodeIssuerSigned.mockResolvedValue({
      issuerAuth: { payload: { docType: "org.iso.18013.5.1.mDL" } },
      nameSpaces: {
        "org.iso.18013.5.1": [
          { elementIdentifier: "family_name", elementValue: "Rossi" },
        ],
      },
    } as never);
    const signer = createMockSigner();

    const result = await evaluateDcqlQuery(mdocQuery, {
      credentialsMdoc: {
        cborDecoder,
        credentials: [["mdoc-credential", signer]],
      },
    });

    expect(cborDecoder.decodeIssuerSigned).toHaveBeenCalledWith(
      expect.any(String),
    );
    expect(result).toEqual([
      expect.objectContaining({
        doctype: "org.iso.18013.5.1.mDL",
        format: "mso_mdoc",
        id: "mdl",
        requiredDisclosures: [
          {
            name: "family_name",
            namespace: "org.iso.18013.5.1",
            value: "Rossi",
          },
        ],
        signer,
      }),
    ]);
  });

  it("requires the decoder together with the mdoc credentials", async () => {
    const signer = createMockSigner();

    await expect(
      evaluateDcqlQuery(mdocQuery, {
        // @ts-expect-error mdoc credentials without a decoder
        credentialsMdoc: { credentials: [["mdoc-credential", signer]] },
      }),
    ).rejects.toThrow();
  });

  it("requires at least one list of credentials", async () => {
    // @ts-expect-error neither SD-JWT nor mdoc credentials
    await expect(evaluateDcqlQuery(mdocQuery, {})).rejects.toThrow();
  });

  it("does not require a decoder when only SD-JWT credentials are provided", async () => {
    await expect(
      evaluateDcqlQuery(mdocQuery, { credentialsSdJwt: [] }),
    ).rejects.toThrow();
  });

  it("propagates decoder failures", async () => {
    const cborDecoder = createMockCborDecoder();
    cborDecoder.decodeIssuerSigned.mockRejectedValue(new Error("bad cbor"));

    await expect(
      evaluateDcqlQuery(mdocQuery, {
        credentialsMdoc: {
          cborDecoder,
          credentials: [["mdoc-credential", createMockSigner()]],
        },
      }),
    ).rejects.toThrow("bad cbor");
  });
});
