import { verifyCertificateChain } from "@pagopa/io-react-native-crypto";
import { decode } from "@pagopa/io-react-native-jwt";

import { verifyAuthRequestCertificateChain as verifyOptional } from "../04-verify-certificate-chain";

const verifyAuthRequestCertificateChain = verifyOptional as NonNullable<
  typeof verifyOptional
>;
import {
  MissingX509CertsError,
  X509ValidationError,
} from "../../../../trust/common/errors";

jest.mock("@pagopa/io-react-native-jwt", () => ({
  decode: jest.fn(),
}));

const mockDecode = decode as jest.Mock;
const mockVerify = verifyCertificateChain as jest.Mock;

describe("verifyAuthRequestCertificateChain", () => {
  beforeEach(() => {
    mockDecode.mockReset();
  });

  it("returns the validation result when the chain is valid", async () => {
    mockDecode.mockReturnValue({ protectedHeader: { x5c: ["leaf", "root"] } });

    const result = await verifyAuthRequestCertificateChain("jwt", {
      caRootCert: "root",
    });

    expect(result.isValid).toBe(true);
    expect(mockVerify).toHaveBeenCalledWith(
      ["leaf"],
      "root",
      expect.anything(),
    );
  });

  it("throws X509ValidationError when the verifier reports an invalid chain", async () => {
    mockDecode.mockReturnValue({ protectedHeader: { x5c: ["leaf"] } });
    mockVerify.mockResolvedValueOnce({
      errorMessage: "expired",
      isValid: false,
      validationStatus: "CERTIFICATE_EXPIRED",
    });

    await expect(
      verifyAuthRequestCertificateChain("jwt", {
        caRootCert: "root",
      }),
    ).rejects.toBeInstanceOf(X509ValidationError);
  });

  it("throws MissingX509CertsError when x5c is absent", async () => {
    mockDecode.mockReturnValue({ protectedHeader: {} });

    await expect(
      verifyAuthRequestCertificateChain("jwt", {
        caRootCert: "root",
      }),
    ).rejects.toBeInstanceOf(MissingX509CertsError);
  });
});
