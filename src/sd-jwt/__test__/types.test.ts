import { Verification } from "../types";

describe("Verification.time", () => {
  test.each([
    ["ISO string", "2025-09-09T10:00:00Z"],
    ["unix seconds", 1752122400],
    ["unix milliseconds", 1752122400000],
  ])("accepts %s", (_label, time) => {
    const value = {
      trust_framework: "eidas",
      assurance_level: "high",
      evidence: [
        {
          type: "vouch",
          time,
          attestation: {
            type: "digital_attestation",
            reference_number: "abc",
            date_of_issuance: "2025-09-02",
            voucher: { organization: "IPZS" },
          },
        },
      ],
    };

    expect(Verification.safeParse(value).success).toBe(true);
  });

  it("rejects invalid type", () => {
    const value = {
      trust_framework: "eidas",
      assurance_level: "high",
      evidence: [
        {
          type: "vouch",
          time: null,
          attestation: {
            type: "digital_attestation",
            reference_number: "abc",
            date_of_issuance: "2025-09-02",
            voucher: { organization: "IPZS" },
          },
        },
      ],
    };

    expect(Verification.safeParse(value).success).toBe(false);
  });
});
