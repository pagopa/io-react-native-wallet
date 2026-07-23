import { Verification } from "../types";

describe("Verification.time", () => {
  test.each([
    ["ISO string", "2025-09-09T10:00:00Z"],
    ["unix seconds", 1752122400],
    ["unix milliseconds", 1752122400000],
  ])("accepts %s", (_label, time) => {
    const value = {
      assurance_level: "high",
      evidence: [
        {
          attestation: {
            date_of_issuance: "2025-09-02",
            reference_number: "abc",
            type: "digital_attestation",
            voucher: { organization: "IPZS" },
          },
          time,
          type: "vouch",
        },
      ],
      trust_framework: "eidas",
    };

    expect(Verification.safeParse(value).success).toBe(true);
  });

  it("rejects invalid type", () => {
    const value = {
      assurance_level: "high",
      trust_framework: ["eidas"],
    };

    expect(Verification.safeParse(value).success).toBe(false);
  });
});
