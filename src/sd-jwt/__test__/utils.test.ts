import { getVerification } from "..";
import { pid } from "../__mocks__/sd-jwt";

const { signed, token } = pid;

describe("SD-JWT getVerification", () => {
  it("extracts the verification claims correctly", () => {
    const disclosure =
      "WyJxTGxVdkNKY3hwX3d4MVY5dHFPbFFRIiwidmVyaWZpY2F0aW9uIix7ImV2aWRlbmNlIjpbeyJhdHRlc3RhdGlvbiI6eyJkYXRlX29mX2lzc3VhbmNlIjoiMjAyNS0wNi0yMyIsInZvdWNoZXIiOnsib3JnYW5pemF0aW9uIjoiTWluaXN0ZXJvIGRlbGwnSW50ZXJubyJ9LCJ0eXBlIjoiZGlnaXRhbF9hdHRlc3RhdGlvbiIsInJlZmVyZW5jZV9udW1iZXIiOiIxMjM0NTY3ODkifSwidGltZSI6IjIwMjUtMDYtMjNUMTM6MTQ6MjVaIiwidHlwZSI6InZvdWNoIn1dLCJ0cnVzdF9mcmFtZXdvcmsiOiJpdF9jaWUiLCJhc3N1cmFuY2VfbGV2ZWwiOiJoaWdoIn1d";
    expect(getVerification(`${signed}~${disclosure}`)).toEqual({
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
    expect(getVerification(token)).toBeUndefined();
  });

  it("throws when the verification claim is invalid", () => {
    const disclosure =
      "WyJxTGxVdkNKY3hwX3d4MVY5dHFPbFFRIiwidmVyaWZpY2F0aW9uIix7InRydXN0X2ZyYW1ld29yayI6ICJpdF9jaWUiLCJhc3N1cmFuY2VfbGV2ZWwiOiAic3Vic3RhbnRpYWwifV0";
    expect(() => getVerification(`${signed}~${disclosure}`)).toThrow();
  });
});
