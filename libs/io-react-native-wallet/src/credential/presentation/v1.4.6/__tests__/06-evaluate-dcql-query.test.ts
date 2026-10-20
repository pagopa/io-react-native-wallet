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

    const result = await evaluateDcqlQuery(
      mdocQuery,
      [],
      [["mdoc-credential", signer]],
      { cborDecoder },
    );

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

  it("propagates decoder failures", async () => {
    const cborDecoder = createMockCborDecoder();
    cborDecoder.decodeIssuerSigned.mockRejectedValue(new Error("bad cbor"));

    await expect(
      evaluateDcqlQuery(
        mdocQuery,
        [],
        [["mdoc-credential", createMockSigner()]],
        { cborDecoder },
      ),
    ).rejects.toThrow("bad cbor");
  });
});
