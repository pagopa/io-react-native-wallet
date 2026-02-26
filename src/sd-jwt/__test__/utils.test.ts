import { legacyPid, pid } from "../__mocks__/sd-jwt";
import { getVerification } from "..";

describe("SD-JWT getVerification", () => {
  it("extracts the verification claims correctly", () => {
    expect(getVerification(pid)).toEqual({
      evidence: [
        {
          attestation: {
            date_of_issuance: "2026-02-17",
            voucher: { organization: "AGID" },
            type: "digital_attestation",
            reference_number: "_d774a38b-4e4c-43d6-aa93-83a398f9124e",
          },
          time: "2026-02-17T10:03:46Z",
          type: "vouch",
        },
      ],
      trust_framework: "it_spid",
      assurance_level: "substantial",
    });
  });

  it("returns undefined when the verification claim is not found", () => {
    expect(getVerification(legacyPid)).toBeUndefined();
  });
});
