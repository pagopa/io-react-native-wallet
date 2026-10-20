import { X509ValidationError } from "../../trust/common/errors";
import { createMockCertificateChainVerifier } from "../__fixtures__/x509";
import { verifyX509Chain } from "../x509";

describe("verifyX509Chain", () => {
  it("resolves when the verifier reports a valid chain", async () => {
    const verifier = createMockCertificateChainVerifier();

    await expect(
      verifyX509Chain(["leaf", "intermediate"], "root", verifier),
    ).resolves.toBeUndefined();
    expect(verifier).toHaveBeenCalledWith(
      ["leaf", "intermediate"],
      "root",
      expect.objectContaining({ requireCrl: true }),
    );
  });

  it("throws X509ValidationError when the verifier reports an invalid chain", async () => {
    const verifier = createMockCertificateChainVerifier();
    verifier.mockResolvedValueOnce({
      errorMessage: "untrusted root",
      isValid: false,
      validationStatus: "INVALID_TRUST_ANCHOR",
    });

    const promise = verifyX509Chain(["leaf"], "root", verifier);

    await expect(promise).rejects.toBeInstanceOf(X509ValidationError);
    await expect(promise).rejects.toThrow(
      /INVALID_TRUST_ANCHOR.*untrusted root/,
    );
  });

  it("propagates errors thrown by the verifier", async () => {
    const verifier = createMockCertificateChainVerifier();
    verifier.mockRejectedValueOnce(new Error("native failure"));

    await expect(verifyX509Chain(["leaf"], "root", verifier)).rejects.toThrow(
      "native failure",
    );
  });

  it("strips the trust anchor from the chain before verifying", async () => {
    const verifier = createMockCertificateChainVerifier();

    await verifyX509Chain(["leaf", "root"], "root", verifier);

    expect(verifier).toHaveBeenCalledWith(["leaf"], "root", expect.anything());
  });
});
