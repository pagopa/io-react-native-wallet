import type { IssuerSigned } from "../types";

import {
  MissingX509CertsError,
  X509ValidationError,
} from "../../trust/common/errors";
import { createMockCborDecoder } from "../../utils/__fixtures__/cbor";
import { createMockCertificateChainVerifier } from "../../utils/__fixtures__/x509";
import { IoWalletError } from "../../utils/errors";
import { verify } from "../index";

jest.mock("../../utils/crypto", () => ({
  ...jest.requireActual("../../utils/crypto"),
  convertBase64DerToPem: jest.fn(() => "PEM"),
  getSigninJwkFromCert: jest.fn(() => ({ kty: "EC", x: "eA", y: "eQ" })),
}));

const makeIssuerSigned = (
  issuerAuth: Partial<IssuerSigned["issuerAuth"]> = {},
): IssuerSigned =>
  ({
    issuerAuth: {
      rawValue: "cose-sign1",
      unprotectedHeader: { x5chain: ["leaf"] },
      ...issuerAuth,
    },
    nameSpaces: {},
  }) as unknown as IssuerSigned;

const setup = (issuerSigned?: IssuerSigned) => {
  const cborDecoder = createMockCborDecoder();
  cborDecoder.decodeIssuerSigned.mockResolvedValue(
    issuerSigned as IssuerSigned,
  );
  return {
    cborDecoder,
    cborVerifier: jest.fn(async () => true),
    certificateChainVerifier: createMockCertificateChainVerifier(),
  };
};

describe("mdoc verify", () => {
  it("returns the decoded IssuerSigned when chain and signature are valid", async () => {
    const issuerSigned = makeIssuerSigned();
    const ctx = setup(issuerSigned);

    await expect(verify("token", "root", ctx)).resolves.toEqual({
      issuerSigned,
    });
    expect(ctx.cborDecoder.decodeIssuerSigned).toHaveBeenCalledWith("token");
    expect(ctx.certificateChainVerifier).toHaveBeenCalledWith(
      expect.any(Array),
      "root",
      expect.anything(),
    );
    expect(ctx.cborVerifier).toHaveBeenCalledWith(
      "cose-sign1",
      expect.objectContaining({ kty: "EC" }),
    );
  });

  it("throws when the decoder returns nothing", async () => {
    const ctx = setup(undefined);

    await expect(verify("token", "root", ctx)).rejects.toThrow("Invalid mDoc");
  });

  it("throws MissingX509CertsError when the x5chain is missing", async () => {
    const ctx = setup(makeIssuerSigned({ unprotectedHeader: {} }));

    await expect(verify("token", "root", ctx)).rejects.toBeInstanceOf(
      MissingX509CertsError,
    );
  });

  it("throws X509ValidationError and skips signature check when the chain is invalid", async () => {
    const ctx = setup(makeIssuerSigned());
    ctx.certificateChainVerifier.mockResolvedValueOnce({
      errorMessage: "bad chain",
      isValid: false,
      validationStatus: "INVALID_CHAIN_PATH",
    });

    await expect(verify("token", "root", ctx)).rejects.toBeInstanceOf(
      X509ValidationError,
    );
    expect(ctx.cborVerifier).not.toHaveBeenCalled();
  });

  it("throws when coseSign1 is missing", async () => {
    const ctx = setup(makeIssuerSigned({ rawValue: undefined }));

    await expect(verify("token", "root", ctx)).rejects.toThrow(IoWalletError);
  });

  it("throws when the signature is not valid", async () => {
    const ctx = setup(makeIssuerSigned());
    ctx.cborVerifier.mockResolvedValueOnce(false);

    await expect(verify("token", "root", ctx)).rejects.toThrow(
      "Invalid mDoc signature",
    );
  });
});
