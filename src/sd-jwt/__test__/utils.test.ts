import { legacyPid, pid } from "../__mocks__/sd-jwt";
import { getVerification } from "..";

describe("SD-JWT getVerification", () => {
  it("extracts the verification claims correctly", () => {
    expect(getVerification(pid)).toEqual({
      evidence: [
        {
          attestation: {
            date_of_issuance: "2025-06-23",
            voucher: { organization: "Ministero dell'Interno" },
            type: "digital_attestation",
            reference_number: "123456789",
          },
          time: "2025-06-23T13:14:25Z",
          type: "vouch",
        },
      ],
      trust_framework: "it_cie",
      assurance_level: "high",
    });
  });

  it("returns undefined when the verification claim is not found", () => {
    expect(getVerification(legacyPid)).toBeUndefined();
  });
});
